import Store from 'electron-store'

interface Config {
  hotkey: string
  pinnedTools: string[]
  autoStart: boolean
  autoUpdate: boolean
  singleToolMode: boolean
  deepseekApiKey: string
}

const store = new Store<Config>({
  defaults: {
    hotkey: 'Ctrl+Space',
    pinnedTools: [],
    autoStart: false,
    autoUpdate: true,
    singleToolMode: true,
    deepseekApiKey: ''
  }
})

export function initConfig() {
  // 配置存储初始化（electron-store 自动处理）
}

export function getConfig<K extends keyof Config>(key: K): Config[K] {
  return store.get(key)
}

export function setConfig<K extends keyof Config>(key: K, value: Config[K]) {
  store.set(key, value)
}

export { store }
