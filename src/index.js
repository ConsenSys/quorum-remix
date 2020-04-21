import { buildIframeClient, PluginClient } from '@remixproject/plugin'
import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import App from './components/App'
import * as serviceWorker from './serviceWorker'
import { rootReducer } from './reducers'
import { applyMiddleware, createStore } from 'redux'
import { Provider } from 'react-redux'
import { composeWithDevTools } from 'redux-devtools-extension'
import thunk from 'redux-thunk'
import { addPublicKey, connectToNetwork, fetchCompilationResult, setError } from './actions'
import { getPluginDevMode, isDevelopment, loadFromLocalStorage } from './utils/EnvUtils'

const store = createStore(rootReducer,
  composeWithDevTools(applyMiddleware(thunk)))

const client = buildIframeClient(new PluginClient({
  devMode: getPluginDevMode()
}))

client.onload(async () => {
  ReactDOM.render(
    <Provider store={store}>
      <App client={client}/>
    </Provider>,
    document.getElementById('root'))

  initPlugin(client, store.dispatch)
  .catch((e) => console.error('Error initializing plugin', e))
  // If you want your app to work offline and load faster, you can change
  // unregister() to register() below. Note this comes with some pitfalls.
  // Learn more about service workers: https://bit.ly/CRA-PWA
  serviceWorker.unregister();
});

if (module.hot) {
  module.hot.accept('./components/App', () => {
    const NextApp = require('./components/App').default
    ReactDOM.render(
      <Provider store={store}>
        <NextApp client={client}/>
      </Provider>,
      document.getElementById('root')
    )
  })
  module.hot.accept('./reducers', () => {
    const nextRootReducer = require('./reducers').default
    store.replaceReducer(nextRootReducer)
  })
}

// we only want to subscribe to these once, so we do it outside of components
async function initPlugin (client, dispatch) {
  if(isDevelopment()) {
    await initDev(client, dispatch)
  }

  if(!window.localStorage) {
    dispatch(setError('Warning: Could not access local storage. You can still use all the features of the plugin, but network urls will not be remembered between reloads. To fix, allow 3rd party cookies in the browser settings. The Quorum plugin does not use cookies, however this setting also blocks the plugin from using local storage to remember settings.'))

  } else {
    const savedNetwork = JSON.parse(loadFromLocalStorage('network') || '{}')
    dispatch(connectToNetwork(savedNetwork.endpoint, savedNetwork.tesseraEndpoint))

    const savedPublicKeys = JSON.parse(loadFromLocalStorage('keysFromUser') || '[]')
    savedPublicKeys.forEach((key) => dispatch(addPublicKey(key)))
  }

  dispatch(fetchCompilationResult(client))
  client.solidity.on('compilationFinished',
    (fileName, source, languageVersion, data) => {
      // just refetching every time for now
      dispatch(fetchCompilationResult(client))
    })
}

async function initDev (client) {
}
