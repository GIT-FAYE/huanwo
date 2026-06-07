import Store from 'electron-store'

interface Config {
  hotkey: string
  pinnedTools: string[]
  autoStart: boolean
  autoUpdate: boolean
  singleToolMode: boolean
  activeProvider: 'qwen' | 'deepseek' | 'mimo'
  deepseekApiKey: string
  qwenApiKey: string
  mimoApiKey: string
  theme: 'auto' | 'light' | 'dark' | 'eye-care' | 'fresh'
}

const store = new Store<Config>({
  defaults: {
    hotkey: 'Ctrl+Space',
    pinnedTools: [],
    autoStart: false,
    autoUpdate: true,
    singleToolMode: true,
    activeProvider: 'qwen',
    deepseekApiKey: '',
    qwenApiKey: '',
    mimoApiKey: '',
    theme: 'auto'
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
