## 第一版本只有iconfont官网项目
### 左侧展示项目列表
### 中间模块展示两个tab：项目icon和iconfont搜索
* 项目icon下面有搜索功能，图标比较多的可以快速搜索（本地js的过滤）
* 项目内icon可以进行移除
* 页面左上角位置有同步按钮
#### iconfont搜索
* icon直接添加到当前项目（顶部给出文字提示）
* 采用分页的方式进行展示，具体每页内容跟iconfont官网同步，展示尽可能一屏展示
### 跟iconfont官网远程同步（支持快捷键）
* 可以左侧一键同步，也可以在项目里单个项目同步
### 同步方案
* 更新操作可以增加快捷键
* 项目根目录下制定iconfont配置文件 .iconfont.json
#### icons同步到指定目录（配置文件进行配置）
* 需要制定icon传输目录
* svg复制
* 提供react和vue项目组件进行引用svg，其它框架，可以用img src属性进行引用或者别的自定义组件
#### smbol方案（也是官网比较推荐的方案）
* `at.alicdn.com/t/font_8d5l8fzk5b87iudi.js`
* 需要制定的模版文件路径（可选）和静态文件路径
```
<style type="text/css">
    .icon {
       width: 1em; height: 1em;
       vertical-align: -0.15em;
       fill: currentColor;
       overflow: hidden;
    }
</style>
这一段代码通过直接插入到模版中
```
* 加载对应的文件到指定的模版文件中即可
```
<svg class="icon" aria-hidden="true">
    <use xlink:href="#icon-xxx"></use>
</svg>
```
* 同步icon先更新js链接
#### font-class使用方式的同步
* 每次查看是否有新icon插入，有的话更新相关文件
```
at.alicdn.com/t/font_8d5l8fzk5b87iudi.css css文件
@font-face {font-family: "iconfont";
  src: url('//at.alicdn.com/t/font_8d5l8fzk5b87iudi.eot?t=1501489744354'); /* IE9*/
  src: url('//at.alicdn.com/t/font_8d5l8fzk5b87iudi.eot?t=1501489744354#iefix') format('embedded-opentype'), /* IE6-IE8 */
  url('//at.alicdn.com/t/font_8d5l8fzk5b87iudi.woff?t=1501489744354') format('woff'), /* chrome, firefox */
  url('//at.alicdn.com/t/font_8d5l8fzk5b87iudi.ttf?t=1501489744354') format('truetype'), /* chrome, firefox, opera, Safari, Android, iOS 4.2+*/
  url('//at.alicdn.com/t/font_8d5l8fzk5b87iudi.svg?t=1501489744354#iconfont') format('svg'); /* iOS 4.1- */
}
加载对应文件；研究一下@font-face属性，是否可以把这些src、url文件都写在一个文件里
```
* 同步时先更新文件
#### android和ios先不处理