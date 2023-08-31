/* eslint-disable @typescript-eslint/naming-convention */
import { ExtensionContext, Position, Range, Uri, ViewColumn, WebviewPanel, window, workspace } from 'vscode';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import { getIndexHtml, getLoadingHtml } from '../utils';
import { vueService } from './service';
import { EventData, EventMessage, Icon, ConfigType } from '../interface';
const system = os.platform().indexOf('win32') > -1 ? 'win' : 'other';

export class VueIconfontHelper {
  webviewPanel: WebviewPanel | undefined;
  context: ExtensionContext;
  projectIcons: Icon[] = [];
  localIcons: Icon[] = [];
  projectRootPath: string | undefined; // 第一个项目根目录
  iconsDirPath: string | undefined;  // icons传输完整目录
  currentTextDocumentFileUri: Uri | undefined; // 当前光标所在工作空间文件
  dirPath: string;   // icons传输配置目录
  currentActiveProject: string; // 保存当前激活的iconfont项目id
  workspaceList: ConfigType[] = [];  // 工作空间list
  constructor(context: ExtensionContext) {
    this.context = context;
    this.dirPath = workspace.getConfiguration().get('iconfont.dirPath') as string || '/src/assets/icons';
    this.currentTextDocumentFileUri = window.activeTextEditor?.document.uri;
    this.currentActiveProject = '';
    this.getLatestAddress();
    console.log(workspace.getConfiguration());
  }
  private getLatestAddress() {
    this.projectRootPath = workspace.workspaceFolders?.[0]?.uri?.fsPath;
    this.iconsDirPath = path.join(this.projectRootPath || '', `./${ this.dirPath }`);
  }
  public async start(projecId: string): Promise<void> {
    // if (!this.projectRootPath) {
    //   window.showErrorMessage('请先打开一个项目');
    //   return;
    // };
    this.generateWorkSpaceList();
    this.openWebview(getLoadingHtml(this.context)); // 先打开loading
    this.localIcons = await vueService.getProjectIcons(projecId); // 获取项目icons
    this.currentActiveProject = projecId;
    this.openWebview(
      getIndexHtml(
        this.context,
        this.webviewPanel,
      )
    );
  }
  // 打开webview
  private openWebview(html: string) {
    const columnToShowIn = window.activeTextEditor
      ? window.activeTextEditor.viewColumn
      : ViewColumn.Active;

    if (!this.webviewPanel) {
      this.webviewPanel = window.createWebviewPanel(
        'iconfont',
        "iconfont助手",
        columnToShowIn || ViewColumn.Active,
        {
          retainContextWhenHidden: true,
          enableScripts: true
        }
      );

      this.webviewPanel.webview.onDidReceiveMessage((e) => this.didReceiveMessage(e));
      this.webviewPanel.onDidDispose(() => {
        this.webviewPanel = undefined;
      });
    } else {
      this.webviewPanel.reveal(columnToShowIn);
    }
    this.webviewPanel.webview.html = html;
    if (this.localIcons) {
      setTimeout(() => {
        this.webviewPanel?.webview?.postMessage({type:'projectIcons',data:this.localIcons});
      });
    }
  }
  // 更新所有icons
  public async updateOperation() {
    await vueService.updateAllProjectIcons();
    //全量更新完成之后更新当前panel的icons
    setTimeout(async () => {
      this.currentActiveProject && this.start(this.currentActiveProject);
    });
  }
  // 传输icons到项目中
  public async transionIconsToProject() {
    const activeProjectConfig = this.workspaceList.find(item => item.active);
    if(!activeProjectConfig){
      window.showInformationMessage('请先配置传输类型和传输位置。');
      return;
    }
    if (activeProjectConfig?.transionMethod === 'svg') {
      if (!fs.existsSync(activeProjectConfig.transionSvgDir)) {
        window.showErrorMessage(activeProjectConfig.projectName+'项目中传输目录不存在，请重新配置传输目录');
       }
      let allIcons = this.context!.globalState.get('iconJsonState') && JSON.parse(String(this.context!.globalState.get('iconJsonState'))) || {};
      allIcons[this.currentActiveProject].icons.map((item: { font_class: string; show_svg: string | NodeJS.ArrayBufferView; }) => {
        fs.writeFileSync(`${ activeProjectConfig.transionSvgDir }/${ item.font_class }.svg`, item.show_svg);
      });
      window.showInformationMessage(`传输完成`);
    } else if (activeProjectConfig?.transionMethod === 'symbol'){
      const iconJsonState = (this.context!.globalState.get('iconJsonState'));
      const currentProjectIconsInfo = JSON.parse(String(iconJsonState))[this.currentActiveProject];
      // 如果symbol file更新了；先更新symbol file然后重新获取新的项目详情再传输symbol file。
      const fileName = await this.getFileAndWrite(currentProjectIconsInfo.icons, activeProjectConfig.transionSymbolJsDir);
      // 写html
      try {
        const html = fs.readFileSync(activeProjectConfig.symbolJsWiteTemplateDir, 'utf8');
        const str = `<script id="fontFile" src="${ fileName }"></script></head>`;
        fs.writeFileSync(activeProjectConfig.symbolJsWiteTemplateDir, html.replace(/<script id\=\"fontFile\"(.*?)<\/script>/g, '').replace('<\/head>', str));
        window.showInformationMessage(`传输完成`);
      } catch (e) {
        window.showErrorMessage(`font.js文件写入模版文件失败`);
      }
    } 
  }
  private async getFileAndWrite(icons: any[], targetDir: string) {
    const svgStr = icons.map(icon => `<symbol id="${icon.font_class}" viewBox="0 0 1024 1024">` + icon.show_svg.replace(/<svg.*?>|<\/svg>/g, '') + '</symbol>').join('');
    const jsStr = `window._iconfont_svg_string_3201924 = '<svg>${ svgStr}</svg>', function (n) { var t = (t = document.getElementsByTagName("script"))[t.length - 1], e = t.getAttribute("data-injectcss"), t = t.getAttribute("data-disable-injectsvg"); if (!t) { var o, i, a, d, c, s = function (t, e) { e.parentNode.insertBefore(t, e) }; if (e && !n.__iconfont__svg__cssinject__) { n.__iconfont__svg__cssinject__ = !0; try { document.write("<style>.svgfont {display: inline-block;width: 1em;height: 1em;fill: currentColor;vertical-align: -0.1em;font-size:16px;}</style>") } catch (t) { console && console.log(t) } } o = function () { var t, e = document.createElement("div"); e.innerHTML = n._iconfont_svg_string_3201924, (e = e.getElementsByTagName("svg")[0]) && (e.setAttribute("aria-hidden", "true"), e.style.position = "absolute", e.style.width = 0, e.style.height = 0, e.style.overflow = "hidden", e = e, (t = document.body).firstChild ? s(e, t.firstChild) : t.appendChild(e)) }, document.addEventListener ? ~["complete", "loaded", "interactive"].indexOf(document.readyState) ? setTimeout(o, 0) : (i = function () { document.removeEventListener("DOMContentLoaded", i, !1), o() }, document.addEventListener("DOMContentLoaded", i, !1)) : document.attachEvent && (a = o, d = n.document, c = !1, r(), d.onreadystatechange = function () { "complete" == d.readyState && (d.onreadystatechange = null, l()) }) } function l() { c || (c = !0, a()) } function r() { try { d.documentElement.doScroll("left") } catch (t) { return void setTimeout(r, 50) } l() } }(window);`
    const hash = crypto.createHash('md5')
    const fileName = `font_symbol_${ hash.update(svgStr).digest('hex') }.js`
    fs.writeFileSync(path.join(targetDir, fileName), jsStr);
    return fileName
  }
  // 生成workspace list
  private generateWorkSpaceList() {
    this.workspaceList = [];
    const wsList = workspace.workspaceFolders || [];
    const getConfig = workspace.getConfiguration("iconfont",undefined);
    this.currentTextDocumentFileUri = window.activeTextEditor?.document.uri
    console.log('window.activeTextEditor?.document.uri;', window.activeTextEditor?.document.uri);
    const config: ConfigType = {
      transionMethod: getConfig.get('transionMethod') || 'svg',
      transionSvgDir: String(getConfig.get('transionSvgDir')).replace('\\', '/') || '',
      transionSymbolJsDir: String( getConfig.get('transionSymbolJsDir')).replace('\\', '/') || '',
      symbolJsWiteTemplateDir: String(getConfig.get('symbolJsWiteTemplateDir')).replace('\\', '/') || '',
      projectName: ''
    };
    wsList.map((item,index) => {
      // 获取根目录下的配置文件
      const configJsondir = item.uri.fsPath + '/.iconfont.json';
      let realConfig = {...config};
      if (fs.existsSync(configJsondir)) {
        const configJsonfile = fs.readFileSync(configJsondir, 'utf8');
        realConfig = Object.assign({}, config, JSON.parse(configJsonfile));
      }
      // 当前光标所在文件即为默认选项
      if (this.currentTextDocumentFileUri && this.currentTextDocumentFileUri.path.indexOf(item.uri.fsPath) > -1) {
        realConfig.active = true;
      }
      // 如果没有打开的项目,默认选中第一个项目
      if (!this.currentTextDocumentFileUri&&index===0) {
        realConfig.active = true;
      }
      const splitStr = system === 'win' ? item.uri.fsPath.split('\\') :item.uri.fsPath.split('/');
      realConfig.projectName = splitStr.slice(-1)[0];
      realConfig.transionSvgDir = path.join(item.uri.fsPath, realConfig.transionSvgDir) ;
      realConfig.transionSymbolJsDir = path.join(item.uri.fsPath, realConfig.transionSymbolJsDir);
      realConfig.symbolJsWiteTemplateDir = path.join(item.uri.fsPath, realConfig.symbolJsWiteTemplateDir);
      this.workspaceList.push(realConfig);
    });
    setTimeout(() => {
      this.webviewPanel?.webview?.postMessage({ type: 'wslist', data: this.workspaceList });
    }, 1000);
  }
  // 监控html页面postmessage
  private async didReceiveMessage(e: EventMessage) {
    const { type, data } = e;
    console.log(type, data);
    switch(type){
      case 'refresh':
        // 刷新
        this.localIcons = await vueService.getProjectIcons(this.currentActiveProject, true); // 获取项目icons
        this.webviewPanel?.webview?.postMessage({type:'projectIcons',data:this.localIcons});
        break;
      case 'search':
        //iconfont的全局搜索
        const { icons, pages } = await vueService.searchGlobalIcons({ t: data.searchValue,page:data.page });
        this.webviewPanel?.webview?.postMessage({type:'iconsSearch',data:icons,pages});
        break;
      case 'delete':
        //项目中icon的删除
        await vueService.deleteIconFromProject(this.currentActiveProject,data as unknown as string|number);
        // 刷新
        this.localIcons = await vueService.getProjectIcons(this.currentActiveProject, true); // 获取项目icons
        this.webviewPanel?.webview?.postMessage({type:'projectIcons',data:this.localIcons});
        break;
      case 'add':
        // 添加图标
        await vueService.insertIconToProject(this.currentActiveProject,data as unknown as string|number);
        // 刷新
        this.localIcons = await vueService.getProjectIcons(this.currentActiveProject, true); // 获取项目icons
        this.webviewPanel?.webview?.postMessage({type:'projectIcons',data:this.localIcons});
        break;
      case 'transition':
        // 传输至本地项目中
        console.log(this.projectIcons, 'projectIcons');
        await this.transionIconsToProject();
      case 'select':
        // 传输至本地项目中
        data&&this.workspaceList.map(item => {
          item.active = item.projectName === String(data)? true:false;
          return item;
        });
        console.log(this.workspaceList)
    }
  }
}