// 与店铺账号管理插件的 collection-dir 语义一致：按账号找采集数据目录。
// 这里只做只读解析（不建目录、不写标记）。
export { collectionDirOf, collectionRoot, dataDir, readAccounts } from './store.mjs';
