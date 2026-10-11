# 国内常用网站与 App 去广告

适用于 Surge iOS 和 macOS 的单一去广告模块。以 APP启动页去广告ultra 为基础精简，整合 B 站开屏、首页和暂停去广告，剔除改区、网站跳转、解锁、独立热搜屏蔽等附加规则。

## 安装

在 Surge 的「模块 → 安装新模块／从 URL 安装模块」中粘贴：

```text
https://raw.githubusercontent.com/Imyukehan/surge-adblock/main/Domestic-Adblock.sgmodule
```

默认分类为「去广告」。已安装的模块也可通过右侧「… → 更改类别」自行归类。

安装后勾选模块，并关闭或删除原来的 Ultra，避免同一接口重复匹配。需要启用 HTTP 重写、脚本和 MITM，并在相应设备上安装、信任 Surge 证书。

B 站开屏列表补丁使用 Surge 内置 JQ 重写，需要 Surge iOS 5.14.0 / Mac 5.9.0 或更新版本。

Mac 和 iPhone 可以使用同一个安装地址。发布修改后，在各设备上更新模块；模块启用状态不会跨设备同步。通过 Mac 网关接管的设备，HTTPS 去广告也需要客户端信任该 Mac 使用的证书。

## 覆盖范围

- B 站：开屏、首页、首页短视频流和播放暂停广告。保留普通推荐、活动卡片、竖屏视频、直播、热搜、动态和弹幕。
- 内容社区：微博、知乎、贴吧、小红书、酷安、LOFTER，以及 Pixiv 的广告处理。
- 购物与生活：淘宝、京东、盒马、美团、拼多多、闲鱼、什么值得买、小米商城、大麦、淘票票、猫眼、贝壳、58 同城等部分广告接口。
- 出行与工具：高德、滴滴、携程、12306、百度网盘、网易云音乐、夸克、米游社、脉脉等部分广告接口。

覆盖的是模块中列出的广告接口，不代表清除每个 App 的全部广告。App 接口变化或已缓存广告可能影响结果。

## 精简原则

不包含代理节点、分流策略、地区修改、网站跳转、会员解锁或通用广告联盟域名封锁。起点不在处理范围内，避免影响奖励广告；其他已启用的拦截规则仍可能影响奖励广告。

B 站启用开屏和首页广告相关参数，并单独接入 `PlayPause` 暂停广告接口；启用 HTTP/2 解密及 `grpc.biliapi.net` 解密以处理该接口。其他 App 仅保留选定接口的上游脚本，第三方脚本内部行为仍由对应版本实现，未对每个 App 的全部界面逐项测试。

Maipo 的 `api.weibo.com` MITM 排除属于设备兼容设置，不放进公共去广告模块；需要时在 Mac 上单独设置。

## 依赖与更新

脚本直接从原作者地址加载，不在本仓库重新分发。`sources.json` 记录下载地址、内容 SHA256 和版本固定状态。15 项依赖固定到 Git 提交、Gist 修订或 BiliVerse 0.7.3 release；小红书的上游 Worker 地址暂时无法固定版本，其更新独立于本仓库。

维护时先检查上游变化及兼容性，再修改模块里的固定链接。不要把整份 Surge 配置、证书、节点凭据或访问令牌放进本仓库。

## 来源

- [Ultra 规则集合](https://yfamilys.com/module/adultra.sgmodule)
- [Biliverse ADBlock](https://github.com/Biliverse/ADBlock)
- [ddgksf2013 Scripts](https://github.com/ddgksf2013/Scripts)
- [app2smile rules](https://github.com/app2smile/rules)
- [blackmatrix7](https://github.com/blackmatrix7/ios_rule_script)
- [deezertidal Surge Module](https://github.com/deezertidal/Surge_Module)

上游作品保留原作者权利及各自许可。本仓库没有对第三方脚本授予额外许可。

## 检查

```bash
python3 tests/validate.py
python3 tests/test_bili_splash.py
```

检查远程依赖地址、脚本唯一性、正则表达式和已排除的功能；本机安装 Surge 时还会执行配置语法检查。

开屏回归检查需要 `jq`，验证广告列表被清空、正常字段和错误响应保持原样，以及规则不匹配首页推荐接口。暂停接口的二进制回归检查可运行 `node tests/test_bili_pause.cjs /path/to/response.bundle.js`；传入的文件必须与 `sources.json` 固定的 SHA256 相符。

## 更新记录

- 2026.10.11.2：接入 Biliverse 原版 `PlayPause` 暂停广告处理，仅匹配暂停接口，不扩展到其他播放或评论接口。

- 2026.10.11.1：补充清空 B 站开屏响应的 `data.list`，修复 Biliverse 0.7.3 只处理其他开屏字段的遗漏。保持原有首页过滤方式。此修改不能直接删除 App 已保存到本机的广告素材，隔夜首次启动效果仍需实测。
