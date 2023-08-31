// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { vueService } from './webview/service';
import * as SideBar from './webview/siderMenu';
import { VueIconfontHelper } from './webview/iconfont';
export function activate(context: vscode.ExtensionContext) {
	const cookie = vscode.workspace.getConfiguration().get('iconfont.cookie') as string;
	if (!cookie) {
		vscode.window.showErrorMessage('请先配置cookie');
		return;
	}
	vueService.setCookie(cookie);
	vueService.setContext(context);
	const siderInstance = new SideBar.ListDataProvider();
	// 创建菜单项
	vscode.window.createTreeView('async-iconfont', {
		treeDataProvider: siderInstance
	});
	const iconfontHelper = new VueIconfontHelper(context);
	// 监听菜单项点击事件
	context.subscriptions.push(vscode.commands.registerCommand('async-iconfont.click', async ({ label }) => {
		iconfontHelper.start(label.id);
		vscode.window.showInformationMessage(`You clicked ${ label.label }`);
	}));
	// 全量更新icons
	context.subscriptions.push(vscode.commands.registerCommand('async-iconfont.refresh', () => {
		iconfontHelper.updateOperation();
		setTimeout(() => {
			siderInstance.refresh();
		});
		vscode.window.showInformationMessage(`You clicked refresh`);
	}));
}
export function deactivate() { }
