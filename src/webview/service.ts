import axios, { AxiosInstance } from 'axios';
import * as vscode from 'vscode';
import { window } from 'vscode';
import { Icon } from '../interface';
import { getCookieConfig, toAwait } from '../utils';
export class VueService {
  request: AxiosInstance | undefined;
  context: vscode.ExtensionContext|undefined;
  contentType: string | undefined;
  cookie: string | undefined;
  public setContext(context:vscode.ExtensionContext) {
    this.context = context;
    this.contentType = 'application/json; charset=utf-8'
  }
  public setCookie(cookie: string) {
    this.cookie = cookie
    axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';
    this.request = axios.create({
      baseURL: 'https://www.iconfont.cn',
      headers: {
        cookie,
      }
    });
  }
  public clearGlobalState() {
    console.log(this.context!.globalState.keys());
    const keys = this.context!.globalState.keys();
    for (const key of keys) {
      this.context!.globalState.update(key, undefined);
    }
  }
  // 获取项目列表
  public async getProject(refresh?: boolean): Promise<Icon[]> {
    // this.clearGlobalState();
    const url = '/api/user/myprojects.json?page=1&isown_create=1&t=1692675848377';
    const url1 = '/api/user/myprojects.json?page=1&isown_create=2&t=1692675848377';
    const projectInfoState = this.context!.globalState.get('projectInfoState');
    if (!refresh&&projectInfoState) {
      return JSON.parse(String(projectInfoState));
    }
    const [error, data] = await toAwait(this.request!.get(url));
    const [error1, data1] = await toAwait(this.request!.get(url1));
    // 第一次如果没有缓存数据，顺便异步请求所有数据，本地缓存
    if (error) {
      window.showErrorMessage('获取项目出错!');
      return [];
    }
    return [...data.ownProjects, ...data1.corpProjects];
  }
  // 如果svg只有一种颜色，就把path中fill替换为currentColor,如果是多种颜色就保留
  private judgementColor(item: any):string {
    const colorTypes = item.path_attributes && [...new Set(item.path_attributes.split('|'))] || [];
    if (colorTypes.length === 1) {
      const color = colorTypes[0].split('=')[1];
      return item.show_svg.replace(new RegExp(colorTypes[0] as string, 'g'), 'fill=currentColor').replace('<svg', `<svg color=${ color }`);
    } else {
      return item.show_svg;
    }
  }
  // 获取项目详情
  public async getIconProjectDetail(id: string) {
    const iconJsonState = this.context!.globalState.get('iconJsonState');
    const cookie = vscode.workspace.getConfiguration().get('iconfont.cookie') as string;
    const [error, data] = await toAwait(
      this.request!.get(`/api/project/detail.json`, { params: { pid: id, t: new Date().getTime(), ctoken: getCookieConfig(cookie, 'ctoken') } })
    );
    if (error) {
      window.showErrorMessage('获取项目信息出错!');
      return [];
    }
    // 顺便更新state
    if (iconJsonState) {
      const json = JSON.parse(String(iconJsonState));
      json[id] = data;
      this.context!.globalState.update('iconJsonState', JSON.stringify(json));
    }
    return data;
  }
  // 获取项目内icons列表
  public async getProjectIcons(pid: string, refresh?: boolean): Promise<Icon[]> {
    console.log(this.context!.globalState.keys());
    const iconJsonState = this.context!.globalState.get('iconJsonState');
    let iconsData: any;
    if (!refresh && iconJsonState) {
      iconsData = JSON.parse(String(iconJsonState))[pid];
    }
    if (!iconsData) {
      iconsData = await this.getIconProjectDetail(pid);
    }
    const icons = iconsData.icons.map((item: any) => ({
      id: String(item.id),
      name: item.name,
      svgContent: this.judgementColor(item),
      code: item.font_class,
    }));
    // 如果是更新icons或者本地缓存中还没有该项目icons，则把缓存中icon也更新
    if (refresh || !iconsData) {
      let allIcons = this.context!.globalState.get('iconJsonState') && JSON.parse(String(this.context!.globalState.get('iconJsonState'))) || {};
      if (allIcons) {
        allIcons[pid] = iconsData;
      }
      this.context!.globalState.update('iconJsonState', JSON.stringify(allIcons));
    }
    return icons;
  }
  // 更新所有项目icon到本地
  public async updateAllProjectIcons() {
    try {
      const allProject = await this.getProject(true);
      this.context!.globalState.update('projectInfoState', JSON.stringify(allProject));
      const allIconsList = await Promise.all(allProject.map((p: any) => toAwait(this.request!.get<any>(`/api/project/detail.json`, { params: { pid: p.id } }))));
      let obj:{[key:string]:any} = {};
      allIconsList.map((item, index) => {
        if (item[1]) {
          obj[allProject[index].id as string] = item[1];
        }
      });
      this.context!.globalState.update('iconJsonState', JSON.stringify(obj));
      window.showInformationMessage('全量更新完成!');
    } catch (e) {
      window.showErrorMessage('全量更新icons失败!');
    }
  }
  // symbol过期，重新生成symbol文件
  public async resetSymbolFile(id:string) {
    const url = '/api/project/cdn.json';
    const cookie = vscode.workspace.getConfiguration().get('iconfont.cookie') as string;
    const [error, data] = await toAwait(this.request!.post(url, { id, ctoken: getCookieConfig(cookie, 'ctoken'), t: new Date().getTime() }));
    if (error) {
      return true;
    } else {
      return false;
    }
  }
  // 搜索全局icon
  public async searchGlobalIcons(search?: any, refresh?: boolean): Promise<{icons:Icon[],pages:number}>{
    const cookie = vscode.workspace.getConfiguration().get('iconfont.cookie') as string;
    const { page = 1, pageSize = 54, fromCollection = 1, q = search.t||'', ctoken = getCookieConfig(cookie,'ctoken') } = search || {};
    const iconJsonState = this.context!.globalState.get('iconJsonState');
    let iconsData: any;
    if (!iconsData) {
      const [error, data] = await toAwait(
        this.request!({
          method:'post',
          url:`/api/icon/search.json`,
          data: { page,pageSize,fromCollection,q,ctoken },
        })
      );
      if (error) {
        window.showErrorMessage('获取项目icons出错!');
        return { icons: [],pages:0};
      }
      iconsData = data;
    }
    const icons = iconsData.icons.map((item: any) => ({
        id: String(item.id),
        name: item.name,
        svgContent: item.show_svg,
        code: item.font_class,
      }));
    return { icons, pages: Math.ceil(iconsData.count / 54) };
  }
  // 把icon添加到项目中
  public async insertIconToProject(pid: string | number, iconId: string | number) {
    const url = '/api/project/addIcons.json';
    const cookie = vscode.workspace.getConfiguration().get('iconfont.cookie') as string;
    const ctoken = getCookieConfig(cookie,'ctoken');
    const [error, data] = await toAwait(
      this.request!({
        method:'post',
        url,
        data: { pid,ids: iconId + '|-1', t: new Date().getTime(),ctoken },
      })
    );
    if (!error) { 
      window.showInformationMessage('添加成功!');
    } else {
      window.showErrorMessage('添加失败!');
    }
  }
  // 从项目中删除icon
  public async deleteIconFromProject(pid: string | number, iconId: string | number) {
    const url = '/api/icon/deleteProjectIcon.json';
    const cookie = vscode.workspace.getConfiguration().get('iconfont.cookie') as string;
    const ctoken = getCookieConfig(cookie,'ctoken');
    const [error, data] = await toAwait(
      this.request!({
        method:'post',
        url,
        data: { pid,ids: Number(iconId),type:'project', t: new Date().getTime(),ctoken },
      })
    );
    if (!error) {
      window.showInformationMessage('删除成功!');
    } else {
      window.showErrorMessage('删除失败!');
    }
  }
}

export const vueService = new VueService();