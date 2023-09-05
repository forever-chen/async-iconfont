
import { ExtensionContext, WebviewPanel, workspace, Uri } from 'vscode';

import * as fs from 'fs';
import * as path from 'path';
import * as ejs from 'ejs';

export const getIndexHtml = (
  context: ExtensionContext,
  webviewPanel: WebviewPanel | undefined,
) => {
  const out = fs.existsSync(path.join(context.extensionPath, 'src')) ? '' : 'out'
  let html = fs.readFileSync(
    path.join(
      context.extensionPath, context!.globalState.get('outExist') as string,'./src/html/index.html'
    )
  ).toString();
  const onDiskPath = Uri.joinPath(context.extensionUri, out,'./src/html')
  const catGifSrc = webviewPanel && webviewPanel.webview.asWebviewUri(onDiskPath);
  // console.log(catGifSrc)
  return html.replace(/\$var_url/g,()=>catGifSrc as unknown as string)
};
export const getLoadingHtml = (
  context: ExtensionContext,
) => {
  const out = fs.existsSync(path.join(context.extensionPath, 'src')) ? '' : 'out'
  let html = fs.readFileSync(
    path.join(
      context.extensionPath, context!.globalState.get('outExist') as string, './src/html/loading.html'
    )
  ).toString();

  html = ejs.render(html);
  return html;
};


export async function toAwait(promise: Promise<any>) {
  if (promise) {
    try {
      const list = await promise;
      const { data, code } = list.data;
      if (code === 200) {
        return [false, data];
      } else {
        return [true, data];
      }
    } catch {
      return [true];
    }
  }
  return [true];
}
// 获取配置信息
export const asyncSvgIconsTransitionDir = function () {
  return workspace.getConfiguration().get('asyncSvgIcons.transitionDir') as string;
};
export const symbolTransitionDir = function () {
  return workspace.getConfiguration().get('asyncSvgIcons.symbol.transitionDir') as string;
};
export const symbolTemplateDir = function () {
  return workspace.getConfiguration().get('asyncSvgIcons.symbol.templateDir') as string;
};
// 解析插件Cookie配置
export const getCookieConfig = (str:string,key:string)=>{
  const cookies = str.split(';');
  const cookiesMap = new Map();
  cookies.forEach(val=>{
    const keyAndValueArr = val.split('=');
    if(keyAndValueArr.length>0){
      cookiesMap.set(keyAndValueArr[0].trim(),keyAndValueArr[1].trim());
    }
  })
  return cookiesMap.get(key);
}