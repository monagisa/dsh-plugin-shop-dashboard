// 插件对外常量：路由前缀与请求头必须与客户端半身一致。
export const PLUGIN = 'shop-dashboard';

/** 本插件 HTTP 面的路径前缀。 */
export const BASE = '/shop-dashboard';

/** 只允许本插件界面调用这几个路由（客户端每个请求都带这个头）。 */
export const REQ_HEADER = 'x-dsh-shop-dashboard';
