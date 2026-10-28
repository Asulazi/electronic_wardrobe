# electronic_wardrobe

一个纯本地的电子衣柜 PWA。数据保存在设备 IndexedDB 中，不接后端、不上传数据、不需要账号。

当前版本支持：

- 上衣、下装、外套、鞋子、帽子等分类
- 春夏秋冬多选季节与筛选
- 一次选择多张图片
- 浏览器本地自动抠图，入库前可确认和重新识别
- 自定义选择单品创建搭配

## 本地开发

```bash
npm install
npm run dev
```

## 构建与发布

```bash
npm run build
npm run deploy
```

线上地址：<https://asulazi.github.io/electronic_wardrobe/>
