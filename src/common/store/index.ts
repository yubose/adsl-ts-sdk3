import Store from './Store'

export { Store }

export default new Store({
  env: 'test',
  configUrl:
    process.env.NODE_ENV === 'test'
      ? 'http://127.0.0.1:3000/config'
      : 'https://public.aitmed.com/config',
})
