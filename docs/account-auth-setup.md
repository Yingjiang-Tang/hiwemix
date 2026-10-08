# 账户功能上线配置

代码已支持登录、注册确认、重发邮件、密码恢复，以及跨设备的邮件令牌验证。Supabase 的线上模板、SMTP 和 OAuth 设置需在项目控制台核对；本次本地修改没有更改这些线上设置。

## 上线顺序

1. 部署本次代码，再修改邮件模板，避免新模板指向尚未上线的回调逻辑。
2. 确认服务端已有 `SUPABASE_SECRET_KEY`。恢复标记使用这个现有服务端密钥签名，不能加 `NEXT_PUBLIC_` 前缀。更换密钥会让未完成的恢复流程失效，用户可重新申请。
3. 核对 URL、邮件模板和发送服务，使用专门测试账号完成下方验收。

## URL 配置

在 Authentication 的 URL Configuration 中：

- Site URL 使用正式主域名 `https://hiwemix.com`。
- Redirect URLs 添加 `https://hiwemix.com/auth/callback**`。
- 本地开发另加 `http://localhost:3000/auth/callback**`。
- 其他测试域名仅在需要时添加准确的域名及回调路径。

回调链接包含 `next` 和流程类型参数，必须一起被白名单接受。项目会将 www 和旧域名重定向到主域名；邮件链接应直接使用主域名。

## 邮件模板：跨设备打开

默认 PKCE 邮件流程依赖发起申请的浏览器。为了支持“电脑申请、手机打开”，请把 Confirm signup 和 Reset password 模板中的按钮链接替换为：

```html
<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}">继续验证</a>
```

本项目传入的 `.RedirectTo` 已包含 `/auth/callback?next=...&type=signup` 或 `type=recovery`，因此这里使用 `&` 追加令牌。先核对模板预览中的完整链接包含正确回调路径和 type 参数；若预览退回 Site URL，应先修正 Redirect URLs。

只用于固定正式域名、不需要保留注册前目标页面时，也可使用以下完整链接：

```html
<!-- Confirm signup -->
<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email">确认邮箱</a>
<!-- Reset password -->
<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery">设置新密码</a>
```

这组固定链接会始终回正式站点，本地联调需使用前一组模板或独立测试项目。不要把带令牌的邮件链接贴到公开日志或问题记录。

## 邮件和第三方登录

- 核对邮箱确认已启用、密码最小长度为 8，与当前表单一致；更严格的密码规则会得到要求提示。
- 使用正式邮件发送服务，核对发件域名、投递状态及发送限额。关闭邮件链接点击追踪，避免链接被改写。
- Google / Facebook 的 provider 配置及供应商回调地址需分别核对；供应商回调应使用 Supabase 控制台给出的地址。
- 前端 60 秒冷却用于防重复操作；Supabase 服务端限流仍是最终约束。

## 真实联调验收

使用专用测试邮箱，不修改客户账户：

1. 新邮箱注册、收信、确认后进入原目标页面；未确认登录时能重发验证邮件。
2. 找回密码：同浏览器打开，以及另一台设备打开，都能显示对应邮箱并修改密码。
3. 已用、过期链接能重新申请；连续申请后使用最新链接。
4. 恢复页面打开后，在另一标签页登录另一账号，旧页面不得修改新账号的密码。
5. 改密成功回登录页，用新密码登录；旧密码失败。恢复标记 15 分钟过期后能重新申请。
6. Google / Facebook 成功、取消、浏览器返回，以及登录后回原目标页面。
7. 弱网络、禁用本地存储、邮件限流，以及手机端密码显示和自动填充。

本地自动化使用受控响应，覆盖页面交互、签名、会话绑定和异常恢复；真实邮件投递、供应商授权及线上会话撤销需要以上联调。改密时会请求全局退出；若认证服务退出失败，当前浏览器仍会清理会话。其他设备的访问令牌仍可能有效至到期，不代表立即失效。

配置依据：[Supabase 邮件模板](https://supabase.com/docs/guides/auth/auth-email-templates)、[Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)、[SSR 客户端](https://supabase.com/docs/guides/auth/server-side/nextjs)。
