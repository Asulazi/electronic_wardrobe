<template>
  <div class="phone">
    <header class="topbar">
      <div class="topbar-copy">
        <div class="title-row">
          <h1>{{ pageTitle }}</h1>
          <span class="version">v{{ appVersion }}</span>
        </div>
        <p>{{ pageSubtitle }}</p>
      </div>
      <button v-if="activeTab !== 'stats'" class="icon-action" type="button" :aria-label="primaryActionLabel" @click="handlePrimaryAction">
        <component :is="primaryIcon" />
      </button>
    </header>

    <main class="content">
      <section v-if="activeTab === 'wardrobe'" class="view">
        <div class="search-bar">
          <Search />
          <input v-model.trim="searchText" type="search" placeholder="搜索名称、品牌、标签、备注" />
        </div>
        <div class="rail">
          <button v-for="mode in viewModes" :key="mode.value" type="button" class="pill" :class="{ active: viewMode === mode.value }" @click="viewMode = mode.value">{{ mode.label }}</button>
        </div>
        <div class="rail compact">
          <button type="button" class="pill small" :class="{ active: categoryFilter === 'all' }" @click="categoryFilter = 'all'">全部 {{ activeClothes.length }}</button>
          <button
            v-for="category in CATEGORIES"
            :key="category.value"
            type="button"
            class="pill small"
            :class="{ active: categoryFilter === category.value }"
            @click="categoryFilter = category.value"
          >{{ category.label }} {{ activeCategoryCounts[category.value] || 0 }}</button>
        </div>
        <div class="rail compact">
          <button type="button" class="pill small" :class="{ active: seasonFilter === 'all' }" @click="seasonFilter = 'all'">全季</button>
          <button v-for="season in SEASONS" :key="season.value" type="button" class="pill small" :class="{ active: seasonFilter === season.value }" @click="seasonFilter = season.value">{{ season.label }}</button>
          <button type="button" class="pill small" :class="{ active: onlyFavorite }" @click="onlyFavorite = !onlyFavorite"><Heart />收藏</button>
          <button type="button" class="pill small" :class="{ active: showArchived }" @click="showArchived = !showArchived"><Archive />归档</button>
          <button type="button" class="pill small" @click="toggleSort"><ArrowDownUp />{{ sortLabel }}</button>
        </div>

        <section v-if="stagedItems.length" class="panel import-panel">
          <header class="panel-header">
            <div><span class="kicker">新增</span><h2>待入库 {{ stagedItems.length }} 件</h2></div>
            <div class="header-actions">
              <button class="text-action" type="button" :disabled="Boolean(processingId) || saving" @click="batchCutout"><ScanLine />{{ batchStatus || '批量抠图' }}</button>
              <button class="icon-action subtle" type="button" @click="clearImport"><X /></button>
            </div>
          </header>
          <div v-if="batchStatus" class="progress-track"><div class="progress-bar"></div></div>
          <article v-for="item in stagedItems" :key="item.key" class="import-card">
            <div class="preview"><img :src="item.workUrl" alt="" /><span class="state">{{ item.error ? '失败' : item.processed ? '已抠图' : processingId === item.key ? '处理中' : '原图' }}</span></div>
            <div class="import-fields">
              <input v-model.trim="item.name" class="input" type="text" placeholder="单品名称" />
              <select v-model="item.category" class="input select">
                <option v-for="category in CATEGORIES" :key="category.value" :value="category.value">{{ category.label }}</option>
              </select>
              <div class="season-picker">
                <button v-for="season in SEASONS" :key="season.value" type="button" class="season" :class="{ active: item.seasons.includes(season.value) }" @click="toggleSeason(item, season.value)">{{ season.label }}</button>
              </div>
              <button class="cut-button" type="button" :disabled="processingId === item.key" @click="processCutout(item)"><Sparkles />{{ item.error ? '重试' : item.processed ? '重新抠图' : '抠图' }}</button>
            </div>
          </article>
          <div class="import-extra">
            <input v-model.trim="bulkBrand" class="input" type="text" placeholder="品牌（可选）" />
            <input v-model="bulkPrice" class="input" type="number" inputmode="decimal" placeholder="价格（可选）" />
          </div>
          <button class="primary-action" type="button" :disabled="saving || !stagedItems.length" @click="saveItems">{{ saving ? '正在保存' : `入库 ${stagedItems.length} 件` }}</button>
          <p v-if="saveError" class="error-text">{{ saveError }}</p>
        </section>

        <div v-if="filteredClothes.length" class="list-meta"><span>共 {{ filteredClothes.length }} 件</span></div>

        <template v-if="filteredClothes.length">
          <section v-if="viewMode === 'grid'" class="wardrobe-grid">
            <article v-for="item in filteredClothes" :key="item.id" class="product-card">
              <button class="product-image" type="button" @click="openDetail(item)">
                <img v-if="item.coverImage" :src="item.coverImage" alt="" />
                <Shirt v-else />
                <span v-if="item.favorite" class="favorite-badge"><Heart /></span>
                <span v-if="item.images.length > 1" class="count-badge">{{ item.images.length }}</span>
              </button>
              <div class="product-info">
                <button class="product-title" type="button" @click="openDetail(item)">{{ item.name }}</button>
                <div class="meta-row">
                  <span>{{ categoryLabel(item.category) }} · {{ statusLabel(item.status) }}</span>
                  <button class="fav-button" type="button" @click="toggleFavorite(item)"><Heart :class="{ filled: item.favorite }" /></button>
                </div>
              </div>
            </article>
          </section>

          <section v-if="viewMode === 'grouped'" class="grouped-view">
            <section v-for="group in groupedClothes" :key="group.value" class="panel">
              <header class="panel-header"><div><span class="kicker">{{ group.count }} 件</span><h2>{{ group.label }}</h2></div></header>
              <div class="group-row">
                <button v-for="item in group.items" :key="item.id" type="button" class="mini-product" @click="openDetail(item)">
                  <img v-if="item.coverImage" :src="item.coverImage" alt="" />
                  <Shirt v-else />
                  <span>{{ item.name }}</span>
                </button>
              </div>
            </section>
          </section>

          <section v-if="viewMode === 'list'" class="list-view">
            <button v-for="item in filteredClothes" :key="item.id" type="button" class="list-row" @click="openDetail(item)">
              <img v-if="item.coverImage" :src="item.coverImage" alt="" />
              <Shirt v-else />
              <span class="list-main"><strong>{{ item.name }}</strong><small>{{ categoryLabel(item.category) }} · 穿过 {{ item.wearCount || 0 }} 次</small></span>
              <ChevronRight />
            </button>
          </section>
        </template>

        <section v-else-if="!stagedItems.length" class="empty">
          <Shirt />
          <h2>{{ clothes.length ? '没有匹配单品' : '衣橱还是空的' }}</h2>
          <p>{{ clothes.length ? '换个筛选或关键词试试。' : '拍照或从相册添加，支持一件多图和本地抠图。' }}</p>
          <button class="primary-action" type="button" @click="openImport">添加单品</button>
        </section>
      </section>

      <section v-if="activeTab === 'outfits'" class="view">
        <div v-if="outfitMode !== 'draft'" class="rail">
          <button type="button" class="pill" :class="{ active: outfitMode === 'list' }" @click="outfitMode = 'list'">搭配册</button>
          <button type="button" class="pill" :class="{ active: outfitMode === 'suggest' }" @click="openSuggestions">本地建议</button>
          <button type="button" class="pill" @click="startOutfit">DIY 拼搭</button>
        </div>

        <section v-if="outfitMode === 'suggest'" class="panel">
          <header class="panel-header">
            <div><span class="kicker">本地推荐</span><h2>今天怎么搭</h2></div>
            <button class="icon-action subtle" type="button" @click="outfitMode = 'list'"><X /></button>
          </header>
          <div class="field-label">场景</div>
          <div class="tag-picker">
            <button v-for="scene in SCENES" :key="scene" type="button" class="tag" :class="{ active: suggestOptions.scene === scene }" @click="suggestOptions.scene = suggestOptions.scene === scene ? '' : scene">{{ scene }}</button>
          </div>
          <div class="weather-row">
            <input v-model.trim="suggestOptions.temperature" class="input" type="text" inputmode="numeric" placeholder="温度：20℃" />
            <button class="primary-action" type="button" @click="generateSuggestions">生成建议</button>
          </div>
          <p v-if="suggestionMessage" class="guide-text">{{ suggestionMessage }}</p>
          <section v-for="(suggestion, index) in suggestions" :key="index" class="suggestion-card">
            <header>
              <strong>{{ suggestion.name }}</strong>
              <button class="secondary-action" type="button" @click="useSuggestion(suggestion)">采用并保存</button>
            </header>
            <div class="choice-grid">
              <div v-for="itemId in suggestion.itemIds" :key="itemId" class="choice static">
                <img v-if="clothesById[itemId]?.coverImage" :src="clothesById[itemId].coverImage" alt="" />
                <Shirt v-else />
                <span>{{ clothesById[itemId]?.name || '已删除' }}</span>
              </div>
            </div>
          </section>
        </section>

        <section v-if="outfitDraft && !clothes.length" class="panel">
          <header class="panel-header"><div><span class="kicker">创建搭配</span><h2>先添加单品</h2></div><button class="icon-action subtle" type="button" @click="outfitDraft = null"><X /></button></header>
          <p class="guide-text">搭配需要从衣橱选择单品。先添加衣服、鞋帽或配饰。</p>
          <button class="primary-action" type="button" @click="goAddClothes">去衣橱添加</button>
        </section>

        <section v-else-if="outfitDraft" class="diy-view">
          <div class="diy-toolbar">
            <button class="icon-close" type="button" title="返回搭配册" aria-label="返回搭配册" @click="cancelOutfitDraft"><ChevronLeft /></button>
            <div class="palette">
              <button
                v-for="color in CANVAS_COLORS"
                :key="color"
                type="button"
                class="palette-dot"
                :class="{ active: outfitDraft.background === color }"
                :style="{ background: color }"
                @click="outfitDraft.background = color"
              ></button>
            </div>
            <button class="icon-action primary" type="button" title="保存" aria-label="保存" :disabled="saving || !outfitDraft.layers.length" @click="saveOutfit"><Check /></button>
          </div>

          <div ref="canvasRef" class="diy-canvas" :style="{ background: outfitDraft.background }" @pointerdown="clearCanvasSelection">
            <div
              v-for="layer in outfitDraft.layers"
              :key="layer.uid"
              class="canvas-item"
              :class="{ selected: selectedLayerId === layer.uid }"
              :style="layerStyle(layer)"
              @pointerdown.stop="startCanvasDrag($event, layer.uid)"
            >
              <img :src="layer.src" alt="" draggable="false" />
              <template v-if="selectedLayerId === layer.uid">
                <button class="canvas-handle remove" type="button" @pointerdown.stop @click="removeLayer(layer.uid)"><X /></button>
                <button class="canvas-handle scale" type="button" title="缩放" @pointerdown.stop="startHandle($event, layer.uid, 'scale')"><Maximize2 /></button>
                <button class="canvas-handle layer-order" type="button" title="调整层级" @pointerdown.stop @click="raiseLayer(layer.uid)"><Layers /></button>
                <button class="canvas-handle rotate" type="button" title="旋转" @pointerdown.stop="startHandle($event, layer.uid, 'rotate')"><RotateCw /></button>
              </template>
            </div>
            <div v-if="!outfitDraft.layers.length" class="canvas-empty">
              <Shirt />
              <strong>从下方添加单品</strong>
              <span>在画布上拖动位置，用角点调整大小和旋转。</span>
            </div>
          </div>

          <div class="diy-bottom">
            <div class="diy-grip"><span></span></div>
            <div class="diy-tabs">
              <button
                v-for="category in CANVAS_CATEGORIES"
                :key="category.value"
                type="button"
                :class="{ active: canvasCategory === category.value }"
                @click="canvasCategory = category.value"
              >{{ category.label }}({{ canvasCounts[category.value] || 0 }})</button>
            </div>
            <div class="diy-shelf">
              <button
                v-for="item in canvasItems"
                :key="item.id"
                type="button"
                class="diy-item"
                :class="{ selected: outfitDraft.itemIds.includes(item.id) }"
                @click="addCanvasItem(item)"
              >
                <img v-if="item.coverImage" :src="item.coverImage" alt="" />
                <Shirt v-else />
                <span v-if="outfitDraft.itemIds.includes(item.id)" class="diy-check"><Check /></span>
              </button>
            </div>
            <button class="diy-settings-toggle" type="button" @click="showDraftMeta = !showDraftMeta">{{ showDraftMeta ? '收起信息' : '搭配信息' }}</button>
            <div v-if="showDraftMeta" class="diy-meta">
              <input v-model.trim="outfitDraft.name" class="input" type="text" placeholder="搭配名称" />
              <div class="tag-picker">
                <button v-for="scene in SCENES" :key="scene" type="button" class="tag" :class="{ active: outfitDraft.scene === scene }" @click="outfitDraft.scene = outfitDraft.scene === scene ? '' : scene">{{ scene }}</button>
              </div>
              <div class="season-picker">
                <button v-for="season in SEASONS" :key="season.value" type="button" class="season" :class="{ active: outfitDraft.seasons.includes(season.value) }" @click="toggleOutfitSeason(season.value)">{{ season.label }}</button>
              </div>
              <div class="weather-row">
                <input v-model.trim="outfitDraft.weather" class="input" type="text" placeholder="天气" />
                <input v-model.trim="outfitDraft.temperature" class="input" type="text" inputmode="numeric" placeholder="温度" />
              </div>
            </div>
          </div>
          <p v-if="saveError" class="error-text">{{ saveError }}</p>
        </section>

        <template v-else>
          <section v-if="!outfits.length && !clothes.length" class="empty">
            <Shirt />
            <h2>先从衣橱开始</h2>
            <p>创建搭配前，先添加几件衣服、鞋帽或配饰。</p>
            <button class="primary-action" type="button" @click="goAddClothes">添加单品</button>
          </section>
          <section v-else-if="!outfits.length" class="empty">
            <Layers />
            <h2>还没有搭配</h2>
            <p>从衣橱挑选单品，创建可复用的穿搭方案。</p>
            <button class="primary-action" type="button" @click="startOutfit">创建搭配</button>
          </section>
          <section v-else class="outfit-list">
        <div class="outfit-catalog">
                <aside class="outfit-sidebar">
                  <button
                    v-if="favoriteOutfits.length"
                    type="button"
                    class="favorite-filter"
                    :class="{ active: outfitListCategory === 'favorites' }"
                    @click="outfitListCategory = 'favorites'"
                  ><Heart /><span>收藏</span></button>
                  <button
                    v-for="category in CANVAS_CATEGORIES"
                    :key="category.value"
                    type="button"
                    :class="{ active: outfitListCategory === category.value }"
                    @click="outfitListCategory = category.value"
                  >{{ category.label }}</button>
                </aside>
                <div class="outfit-catalog-list">
                  <article
                    v-for="catalogOutfit in filteredOutfits"
                    :key="catalogOutfit.id"
                    class="outfit-card compact"
                  >
                    <button class="outfit-preview" type="button" @click="openOutfitDetail(catalogOutfit)">
                      <div class="outfit-layout-preview compact" :style="{ background: catalogOutfit.background || '#fff' }">
                        <div
                          v-for="layer in outfitDisplayLayers(catalogOutfit)"
                          :key="`${catalogOutfit.id}-${layer.itemId}`"
                          class="layout-item"
                          :style="layerStyle(layer)"
                        >
                          <img v-if="clothesById[layer.itemId]?.coverImage" :src="clothesById[layer.itemId].coverImage" alt="" />
                        </div>
                      </div>
                    </button>
                    <div class="outfit-footer">
                      <strong>{{ catalogOutfit.name }}</strong>
                      <span>{{ formatDate(catalogOutfit.createdAt) }}</span>
                      <div class="preview-actions">
                        <button class="icon-action subtle" type="button" title="编辑布局" aria-label="编辑布局" @click="editOutfitLayout(catalogOutfit)"><PenLine /></button>
                        <button class="icon-action subtle favorite" :class="{ selected: catalogOutfit.favorite }" type="button" title="收藏搭配" aria-label="收藏搭配" @click="toggleOutfitFavorite(catalogOutfit)"><Heart :class="{ filled: catalogOutfit.favorite }" /></button>
                        <button class="icon-action subtle" type="button" title="复制搭配" aria-label="复制搭配" @click="duplicateOutfit(catalogOutfit)"><Copy /></button>
                        <button class="icon-action subtle" type="button" title="删除搭配" aria-label="删除搭配" @click="deleteOutfit(catalogOutfit)"><Trash2 /></button>
                      </div>
                    </div>
                  </article>
                  <p v-if="!filteredOutfits.length" class="guide-text empty-category">这个分类还没有搭配。</p>
                </div>
              </div>
          </section>
        </template>
      </section>

      <section v-if="activeTab === 'calendar'" class="view">
        <WearCalendar
          :logs="wearLogs"
          :clothes-by-id="clothesById"
          :outfits-by-id="outfitsById"
          :year="calendarYear"
          :month="calendarMonth"
          @open-date="openDateLog"
          @navigate="navigateCalendar"
        />
        <section class="panel">
          <header class="panel-header"><div><span class="kicker">本页统计</span><h2>{{ calendarYear }} 年 {{ calendarMonth + 1 }} 月</h2></div></header>
          <div class="profile-stats cols-3">
            <div><strong>{{ monthLogCount }}</strong><span>记录次数</span></div>
            <div><strong>{{ monthActiveItems.length }}</strong><span>穿过单品</span></div>
            <div><strong>{{ monthUnusedCount }}</strong><span>本月未穿</span></div>
          </div>
        </section>
      </section>

      <section v-if="activeTab === 'stats'" class="view">
        <WearStats :clothes="clothes" :outfits="outfits" :logs="wearLogs" @open-item="openDetail" />
      </section>

      <section v-if="activeTab === 'settings'" class="view">
        <section class="profile-card">
          <div class="avatar"><ShieldCheck /></div>
          <div><strong>本地衣橱</strong><span>无账号 · 不上传 · 离线可用</span></div>
        </section>
        <section class="panel">
          <header class="panel-header"><div><span class="kicker">数据安全</span><h2>备份与恢复</h2></div></header>
          <p class="guide-text">导出包含衣服、搭配、穿着记录和图片的 JSON 备份。导入会覆盖当前数据。</p>
          <button class="primary-action" type="button" :disabled="backupBusy" @click="handleExport">{{ backupBusy ? '处理中' : '导出备份' }}</button>
          <button class="secondary-action full" type="button" @click="backupInput?.click()">导入备份</button>
          <p v-if="backupMessage" class="backup-message">{{ backupMessage }}</p>
        </section>
        <section class="panel">
          <header class="panel-header"><div><span class="kicker">表格数据</span><h2>Excel 导出 / 导入</h2></div></header>
          <p class="guide-text">Excel 只同步文字资料，不包含图片。导入会新增单品，不会覆盖现有数据。</p>
          <button class="primary-action" type="button" @click="handleExcelExport">导出 Excel</button>
          <button class="secondary-action full" type="button" @click="excelInput?.click()">导入 Excel</button>
          <p v-if="excelMessage" class="backup-message">{{ excelMessage }}</p>
        </section>
        <section class="panel">
          <header class="panel-header"><div><span class="kicker">显示偏好</span><h2>默认设置</h2></div></header>
          <label class="setting-row">
            <span>默认隐藏归档</span>
            <input v-model="settings.hideArchived" type="checkbox" @change="saveSettings" />
          </label>
          <label class="setting-row">
            <span>默认网格视图</span>
            <input v-model="settings.defaultGrid" type="checkbox" @change="saveSettings" />
          </label>
          <label class="setting-row">
            <span>显示价格与消费统计</span>
            <input v-model="settings.showPrice" type="checkbox" @change="saveSettings" />
          </label>
        </section>
        <section class="panel">
          <header class="panel-header"><div><span class="kicker">衣橱状态</span><h2>统计</h2></div></header>
          <div class="profile-stats">
            <div><strong>{{ clothes.length }}</strong><span>单品</span></div>
            <div><strong>{{ outfits.length }}</strong><span>搭配</span></div>
            <div><strong>{{ wearLogs.length }}</strong><span>记录</span></div>
            <div><strong>{{ processedCount }}</strong><span>已抠图</span></div>
          </div>
        </section>
      </section>
    </main>

        <div v-if="detailItem" class="sheet-backdrop" @click="discardDetail">
          <section class="sheet" @click.stop>
          <header class="detail-topbar">
          <button class="icon-close" type="button" title="取消" aria-label="取消" @click="discardDetail"><X /></button>
            <input v-model.trim="detailItem.name" class="detail-name-input" type="text" />
          <button class="icon-action primary" type="button" :title="pendingWearDate ? '补录保存' : '保存'" :aria-label="pendingWearDate ? '补录保存' : '保存'" :disabled="saving" @click="recordCurrentItemForPendingDate">
            <Check />
          </button>
          </header>
        <div v-if="detailItem.images.length" class="carousel">
          <img :src="detailImages[detailCarouselIndex]" alt="" />
          <span v-if="detailCarouselIndex === 0" class="cover-badge">封面</span>
          <button v-if="detailImages.length > 1" class="carousel-delete" type="button" @click="deleteDetailImage">
            <Trash2 />
          </button>
          <button v-if="detailImages.length > 1" class="carousel-nav left" type="button" @click="previousImage"><ChevronLeft /></button>
          <button v-if="detailImages.length > 1" class="carousel-nav right" type="button" @click="nextImage"><ChevronRight /></button>
          <span class="carousel-count">{{ detailImageIndex + 1 }}/{{ detailImages.length }}</span>
        </div>
        <div v-if="detailImages.length > 1" class="thumbnail-strip">
          <button
            v-for="(imageUrl, index) in detailImages"
            :key="index"
            type="button"
            :class="{ active: index === detailCarouselIndex }"
            @click="detailImageIndex = index"
          >
            <img :src="imageUrl" alt="" />
            <span v-if="index === 0" class="mini-cover">封面</span>
          </button>
        </div>
        <div v-if="detailImages.length" class="image-actions">
          <button
            class="secondary-action"
            type="button"
            :disabled="detailCarouselIndex === 0"
            @click="setDetailCover(detailCarouselIndex)"
          >
            <Star />
            设为封面
          </button>
          <button class="secondary-action" type="button" @click="replaceInput?.click()">
            <ImagePlus />
            替换这张
          </button>
        </div>
        <input ref="replaceInput" class="hidden-input" type="file" accept="image/*" @change="replaceDetailImage" />
        <label class="add-photo">
          <input type="file" accept="image/*" multiple @change="addDetailImages" />
          <span><ImagePlus />添加正面 / 背面 / 细节图</span>
        </label>
        <div class="detail-actions image-save-wrap">
          <button class="icon-action primary large" type="button" :title="pendingWearDate ? '补录保存' : '保存'" :aria-label="pendingWearDate ? '补录保存' : '保存'" :disabled="saving" @click="saveDetail"><Check /></button>
          <span class="button-label">保存图片与资料修改</span>
        </div>
        <div class="detail-grid">
          <div class="detail-fields">
            <label><span>名称</span><input v-model.trim="detailItem.name" class="input" type="text" /></label>
            <label><span>品类</span>
              <select v-model="detailItem.category" class="input select">
                <option v-for="category in CATEGORIES" :key="category.value" :value="category.value">{{ category.label }}</option>
              </select>
            </label>
            <label><span>状态</span>
              <select v-model="detailItem.status" class="input select">
                <option v-for="status in STATUSES" :key="status.value" :value="status.value">{{ status.label }}</option>
              </select>
            </label>
          </div>
          <div class="detail-fields">
            <label><span>品牌</span><input v-model.trim="detailItem.brand" class="input" type="text" /></label>
            <label><span>尺码</span><input v-model.trim="detailItem.size" class="input" type="text" /></label>
            <label><span>价格</span><input v-model.number="detailItem.price" class="input" type="number" inputmode="decimal" /></label>
          </div>
        </div>
        <label><span class="field-label">材质</span>
          <select v-model="detailItem.material" class="input select">
            <option value="">未设置</option>
            <option v-for="material in MATERIALS" :key="material" :value="material">{{ material }}</option>
          </select>
        </label>
        <div class="two-fields">
          <label><span class="field-label">主色</span><input v-model.trim="detailItem.primaryColor" class="input" type="text" placeholder="米白" /></label>
          <label><span class="field-label">辅色</span><input v-model.trim="detailItem.secondaryColor" class="input" type="text" placeholder="黑色" /></label>
        </div>
        <div class="two-fields">
          <label><span class="field-label">购入时间</span><input v-model="detailItem.purchasedAt" class="input" type="date" /></label>
          <label><span class="field-label">购买渠道</span><input v-model.trim="detailItem.purchaseChannel" class="input" type="text" /></label>
        </div>
        <div class="field-label">季节</div>
        <div class="season-picker">
          <button v-for="season in SEASONS" :key="season.value" type="button" class="season" :class="{ active: detailItem.seasons.includes(season.value) }" @click="toggleDetailSeason(season.value)">{{ season.label }}</button>
        </div>
        <div class="field-label">标签</div>
        <div class="tag-picker">
          <button v-for="tag in commonTags" :key="tag" type="button" class="tag" :class="{ active: detailItem.tags.includes(tag) }" @click="toggleDetailTag(tag)">{{ tag }}</button>
        </div>
        <div class="tag-add">
          <input v-model.trim="newTag" class="input" type="text" placeholder="自定义标签" @keyup.enter="addDetailTag" />
          <button class="secondary-action" type="button" @click="addDetailTag">添加</button>
        </div>
        <label><span class="field-label">保养 / 本地备忘</span><textarea v-model="detailItem.memo" class="input note" rows="3"></textarea></label>
        <label class="setting-row">
          <span>归档（默认筛选隐藏）</span>
          <input v-model="detailItem.archived" type="checkbox" />
        </label>
        <div class="detail-stats"><span>穿过 {{ detailItem.wearCount || 0 }} 次</span><span>最近 {{ formatDate(detailItem.lastWornAt) }}</span><span>入库 {{ formatDate(detailItem.createdAt) }}</span></div>
        <div v-if="!pendingWearDate" class="detail-actions">
          <button class="primary-action" type="button" @click="recordItemWear(detailItem)">记录今天穿着</button>
          <button class="danger-action" type="button" @click="deleteClothes(detailItem)">删除单品</button>
        </div>
      </section>
    </div>

    <div v-if="detailOutfit" class="sheet-backdrop" @click="closeOutfitDetail">
      <section class="sheet" @click.stop>
        <header class="detail-topbar">
          <button class="icon-close" type="button" title="关闭" aria-label="关闭" @click="closeOutfitDetail"><X /></button>
          <input v-model.trim="detailOutfit.name" class="detail-name-input" type="text" />
          <button class="icon-action primary" type="button" title="保存" aria-label="保存" :disabled="savingOutfitDetail" @click="saveOutfitDetail"><Check /></button>
        </header>
          <button
            v-if="detailOutfit.itemIds.some((itemId) => detailOutfit.layout?.[String(itemId)])"
            class="outfit-detail-preview"
            type="button"
            title="编辑搭配布局"
            aria-label="编辑搭配布局"
            @click="editOutfitLayout(detailOutfit)"
          >
            <div class="outfit-layout-preview" :style="{ background: detailOutfit.background || '#fff' }">
              <div
                v-for="layer in outfitLayoutLayers(detailOutfit)"
                :key="layer.itemId"
                class="layout-item"
                :style="{
                  left: `${layer.x}%`,
                  top: `${layer.y}%`,
                  width: `${layer.width}%`,
                  transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`,
                  zIndex: layer.z
                }"
              >
                <img v-if="clothesById[layer.itemId]?.coverImage" :src="clothesById[layer.itemId].coverImage" alt="" />
              </div>
            </div>
          </button>
          <div v-else class="choice-grid">
            <div v-for="itemId in detailOutfit.itemIds" :key="itemId" class="choice static">
              <img v-if="clothesById[itemId]?.coverImage" :src="clothesById[itemId].coverImage" alt="" />
              <Shirt v-else />
              <span>{{ clothesById[itemId]?.name || '已删除' }}</span>
            </div>
          </div>
        <div class="field-label">场景</div>
        <div class="tag-picker">
          <button v-for="scene in SCENES" :key="scene" type="button" class="tag" :class="{ active: detailOutfit.scene === scene }" @click="detailOutfit.scene = detailOutfit.scene === scene ? '' : scene">{{ scene }}</button>
        </div>
        <div class="weather-row">
          <input v-model.trim="detailOutfit.weather" class="input" type="text" placeholder="天气" />
          <input v-model.trim="detailOutfit.temperature" class="input" type="text" inputmode="numeric" placeholder="温度" />
        </div>
        <div class="season-picker">
          <button v-for="season in SEASONS" :key="season.value" type="button" class="season" :class="{ active: detailOutfit.seasons.includes(season.value) }" @click="toggleDetailOutfitSeason(season.value)">{{ season.label }}</button>
        </div>
        <div class="detail-stats"><span>穿过 {{ detailOutfit.wearCount || 0 }} 次</span></div>
        <label class="date-record-row">
          <span>记录日期</span>
          <input v-model="outfitRecordDate" class="input" type="date" />
        </label>
        <div class="detail-actions">
          <button class="primary-action has-leading-icon" type="button" @click="exportDetailOutfitImage"><Download /><span>导出搭配图</span></button>
        </div>
        <div class="detail-actions">
          <button class="primary-action has-leading-icon" type="button" :aria-label="`补录到 ${formatChineseDate(outfitRecordDate)}`" @click="logOutfitDetailDate"><CalendarCheck /><span>{{ outfitRecordDate === todayKey() ? '记录今天穿着' : '补录穿着' }}</span></button>
        </div>
        <div class="detail-actions">
          <button class="danger-action has-leading-icon" type="button" @click="deleteOutfit(detailOutfit)"><Trash2 /><span>删除搭配</span></button>
        </div>
      </section>
    </div>

    <div v-if="outfitResult" class="sheet-backdrop" @click="closeOutfitResult">
      <section class="sheet result-sheet" @click.stop>
        <header class="detail-topbar">
          <button class="icon-close" type="button" title="返回" aria-label="返回" @click="closeOutfitResult"><X /></button>
          <strong class="detail-name">{{ outfitResult.name }}</strong>
          <button class="icon-action primary" type="button" title="下载" aria-label="下载" @click="downloadOutfitResult"><Download /></button>
        </header>
        <img class="result-image" :src="outfitResult.url" :alt="outfitResult.name" />
        <p class="result-tip">保存成功了。长按图片也可以存到相册。</p>
        <div class="detail-actions two-actions">
          <button class="secondary-action" type="button" @click="closeOutfitResult">查看结果</button>
          <button class="secondary-action" type="button" @click="continueOutfitDraft">继续搭配</button>
        </div>
      </section>
    </div>

    <div v-if="outfitSaveMeta" class="sheet-backdrop" @click="outfitSaveMeta = false">
      <section class="sheet" @click.stop>
        <header class="detail-topbar">
          <button class="icon-close" type="button" title="返回" aria-label="返回" @click="outfitSaveMeta = false"><X /></button>
          <strong class="detail-name">搭配信息</strong>
          <button class="icon-action primary" type="button" title="保存" aria-label="保存" :disabled="saving" @click="confirmSaveOutfit"><Check /></button>
        </header>
        <label><span class="field-label">名称</span><input v-model.trim="outfitSaveMeta.name" class="input" type="text" placeholder="例如：通勤黑裤套装" /></label>
        <div class="field-label">场景</div>
        <div class="tag-picker">
          <button v-for="scene in SCENES" :key="scene" type="button" class="tag" :class="{ active: outfitSaveMeta.scene === scene }" @click="outfitSaveMeta.scene = outfitSaveMeta.scene === scene ? '' : scene">{{ scene }}</button>
        </div>
        <div class="season-picker">
          <button v-for="season in SEASONS" :key="season.value" type="button" class="season" :class="{ active: outfitSaveMeta.seasons.includes(season.value) }" @click="toggleOutfitSaveSeason(season.value)">{{ season.label }}</button>
        </div>
        <div class="weather-row">
          <input v-model.trim="outfitSaveMeta.weather" class="input" type="text" placeholder="天气" />
          <input v-model.trim="outfitSaveMeta.temperature" class="input" type="text" inputmode="numeric" placeholder="温度" />
        </div>
        <p class="guide-text">保存后会生成本地搭配图，可以长按保存。</p>
      </section>
    </div>

        <div v-if="dateLog" class="sheet-backdrop" @click="dateLog = null">
      <section class="sheet" @click.stop>
        <header class="sheet-header">
          <div><span class="kicker">穿搭记录</span><h2>{{ formatFullChineseDate(dateLog.date) }}</h2></div>
          <button class="icon-action subtle" type="button" @click="dateLog = null"><X /></button>
        </header>
        <div v-if="dateLog.entries.length" class="date-log-list">
          <article
            v-for="entry in dateLog.entries"
            :key="entry.id"
            class="date-log-item"
            :class="{ clickable: entry.clickable }"
            role="button"
            :tabindex="entry.clickable ? 0 : -1"
            @click="entry.clickable && openDateLogEntry(entry)"
            @keyup.enter="entry.clickable && openDateLogEntry(entry)"
          >
            <img v-if="entry.image" :src="entry.image" alt="" />
            <Shirt v-else />
            <div class="log-main">
              <strong>{{ entry.title }}</strong>
              <span>{{ entry.subtitle }}</span>
            </div>
            <ChevronRight v-if="entry.clickable" />
          </article>
        </div>
        <p v-else class="guide-text">这一天还没有记录。</p>
        <div v-if="!dateLog.picker" class="date-log-actions">
          <button class="secondary-action full" type="button" @click="startDatePicker('single')">补录单品</button>
          <button class="secondary-action full" type="button" @click="startDatePicker('outfit')">补录搭配</button>
        </div>
        <div v-else class="collection-picker">
          <div class="picker-title">
            <strong>{{ dateLog.picker === 'single' ? '选择单品' : '选择搭配' }}</strong>
            <button class="text-action" type="button" @click="dateLog.picker = ''; dateLog.selectedIds = []">取消</button>
          </div>
          <div class="selection-grid">
            <template v-if="dateLog.picker === 'single'">
              <button
                v-for="item in activeClothes"
                :key="item.id"
                type="button"
                class="selection-card"
                :class="{ selected: dateLog.selectedIds.includes(item.id) }"
                @click="toggleDateSelection(item.id)"
              >
                <img v-if="item.coverImage" :src="item.coverImage" alt="" />
                <Shirt v-else />
                <strong>{{ item.name }}</strong>
                <span>{{ categoryLabel(item.category) }} · {{ statusLabel(item.status) }}</span>
                <span class="check"><Check /></span>
              </button>
            </template>
            <template v-else>
              <button
                v-for="outfit in outfits"
                :key="outfit.id"
                type="button"
                class="selection-card"
                :class="{ selected: dateLog.selectedIds.includes(outfit.id) }"
                @click="toggleDateSelection(outfit.id)"
              >
                <img v-if="outfitPreview(outfit)" :src="outfitPreview(outfit)" alt="" />
                <Layers v-else />
                <strong>{{ outfit.name }}</strong>
                <span>{{ outfitMeta(outfit) }}</span>
                <span class="check"><Check /></span>
              </button>
            </template>
          </div>
          <p v-if="dateLog.picker === 'single' ? !activeClothes.length : !outfits.length" class="guide-text">
            {{ dateLog.picker === 'single' ? '还没有可补录的单品。' : '还没有可补录的搭配。' }}
          </p>
          <button class="primary-action full" type="button" :disabled="!dateLog.selectedIds.length" @click="confirmDateSelection">
            确认补录{{ dateLog.selectedIds.length ? `（${dateLog.selectedIds.length}）` : '' }}
          </button>
        </div>
      </section>
    </div>

    <input ref="fileInput" class="hidden-input" type="file" accept="image/*" multiple @change="handleFiles" />
    <input ref="backupInput" class="hidden-input" type="file" accept="application/json,.json" @change="handleBackupImport" />
    <input ref="excelInput" class="hidden-input" type="file" accept=".xlsx,.xls,.csv" @change="handleExcelImport" />

    <button v-if="activeTab !== 'settings' && outfitMode !== 'draft'" class="floating-add" type="button" @click="handleCenterAdd"><Plus /></button>
    <nav class="bottom-nav" aria-label="主导航">
      <button type="button" :class="{ active: activeTab === 'wardrobe' }" @click="activeTab = 'wardrobe'"><Shirt /><span>衣橱</span></button>
      <button type="button" :class="{ active: activeTab === 'outfits' }" @click="activeTab = 'outfits'"><Layers /><span>搭配册</span></button>
      <button type="button" :class="{ active: activeTab === 'calendar' }" @click="activeTab = 'calendar'"><CalendarDays /><span>日历</span></button>
      <button type="button" :class="{ active: activeTab === 'stats' }" @click="activeTab = 'stats'"><ChartColumn /><span>统计</span></button>
      <button type="button" :class="{ active: activeTab === 'settings' }" @click="activeTab = 'settings'"><Settings /><span>设置</span></button>
    </nav>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, toRaw } from 'vue'
import { watch } from 'vue'
import { removeBackground } from '@imgly/background-removal'
import {
  Archive, ArrowDownUp, CalendarDays, ChartColumn, ChevronLeft, ChevronRight, Copy, Download, Heart,
  CalendarCheck,
  Check, ImagePlus, Layers, Maximize2, PenLine, Plus, RotateCw, ScanLine, Search, Settings, ShieldCheck, Shirt, Sparkles, Star, Trash2, X
} from 'lucide-vue-next'
import WearCalendar from './components/WearCalendar.vue'
import WearStats from './components/WearStats.vue'
import { exportBackup, importBackup } from './backup'
import { exportClothesExcel, importClothesExcel } from './excel'
import { buildOutfitImage, exportOutfitImage } from './outfitImage'
import { suggestOutfits } from './suggest'
import { db } from './db'
import { dataUrlFromImage, imageUrl, normalizeImages } from './images'
import { CATEGORIES, MATERIALS, SCENES, SEASONS, STATUSES, categoryLabel, formatDate, seasonText, statusLabel } from './config'

const appVersion = __APP_VERSION__
const activeTab = ref('wardrobe')
const clothes = ref([])
const outfits = ref([])
const wearLogs = ref([])
const stagedItems = ref([])
const processingId = ref('')
const batchStatus = ref('')
const saving = ref(false)
const categoryFilter = ref('all')
const seasonFilter = ref('all')
const searchText = ref('')
const onlyFavorite = ref(false)
const showArchived = ref(false)
const sortMode = ref('newest')
const viewMode = ref('grid')
const outfitMode = ref('list')
const fileInput = ref(null)
const backupInput = ref(null)
const outfitDraft = ref(null)
const canvasRef = ref(null)
const canvasCategory = ref('all')
const outfitListCategory = ref('all')
const selectedLayerId = ref(null)
const showDraftMeta = ref(false)
const outfitSaveMeta = ref(null)
const outfitResult = ref(null)
const savingOutfitDetail = ref(false)
const CANVAS_COLORS = ['#ffffff', '#e9dff2', '#f6ead8', '#f1f1ee', '#f4f6dd', '#dff0f8', '#f8e2e2']
const CANVAS_CATEGORIES = [
  { value: 'all', label: '全部' },
  ...CATEGORIES.filter((category) => ['top', 'bottom', 'dress', 'outerwear', 'shoes', 'hat', 'accessory'].includes(category.value))
]
const saveError = ref('')
const detailItem = ref(null)
const detailImageIndex = ref(0)
const detailOutfit = ref(null)
const dateLog = ref(null)
const newTag = ref('')
const replaceInput = ref(null)
const bulkBrand = ref('')
const bulkPrice = ref(null)
const backupBusy = ref(false)
const backupMessage = ref('')
const excelInput = ref(null)
const excelMessage = ref('')
const suggestions = ref([])
const suggestionMessage = ref('')
const suggestOptions = reactive({ scene: '', temperature: '' })
const pendingWearDate = ref(null)
const outfitRecordDate = ref(new Date().toISOString().slice(0, 10))
const now = new Date()
const calendarYear = ref(now.getFullYear())
const calendarMonth = ref(now.getMonth())
const settings = reactive({ hideArchived: true, defaultGrid: true, showPrice: true })
const anySheetOpen = computed(() => Boolean(detailItem.value || detailOutfit.value || outfitResult.value || outfitSaveMeta.value || dateLog.value))
watch(anySheetOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

const viewModes = [
  { value: 'grid', label: '网格' },
  { value: 'grouped', label: '分类分组' },
  { value: 'list', label: '列表' }
]
const commonTags = ['通勤', '休闲', '度假', '约会', '厚款', '易皱', '需干洗', '闲置待出']

const pageTitle = computed(() => ({
  wardrobe: '我的衣橱',
  outfits: '搭配册',
  calendar: '穿搭日历',
  stats: '衣橱统计',
  settings: '设置'
}[activeTab.value]))

const pageSubtitle = computed(() => ({
  wardrobe: `${activeClothes.value.length} 件在用 · ${clothes.value.filter(i => i.archived).length} 件归档`,
  outfits: `${outfits.value.length} 套搭配方案`,
  calendar: `${calendarYear.value} 年 ${calendarMonth.value + 1} 月`,
  stats: '本机自动计算，不上传数据',
  settings: '隐私、备份与偏好'
}[activeTab.value]))

const primaryIcon = computed(() => activeTab.value === 'settings' ? Download : Plus)
const primaryActionLabel = computed(() => activeTab.value === 'settings' ? '下载备份' : '添加')

const activeClothes = computed(() => clothes.value.filter((item) => !item.archived))
const activeCategoryCounts = computed(() => activeClothes.value.reduce((result, item) => {
  result[item.category] = (result[item.category] || 0) + 1
  return result
}, {}))
const clothesById = computed(() => Object.fromEntries(clothes.value.map((item) => [item.id, item])))
const outfitsById = computed(() => Object.fromEntries(outfits.value.map((item) => [item.id, item])))
const processedCount = computed(() => clothes.value.filter((item) => item.processed).length)
const sortLabel = computed(() => ({ newest: '最新', oldest: '最早', worn: '常穿' }[sortMode.value]))

const filteredClothes = computed(() => {
  const keyword = searchText.value.toLowerCase()
  let result = clothes.value.filter((item) => {
    const archivedOk = showArchived.value ? true : !item.archived
    const categoryOk = categoryFilter.value === 'all' || item.category === categoryFilter.value
    const seasonOk = seasonFilter.value === 'all' || item.seasons.includes(seasonFilter.value)
    const favoriteOk = !onlyFavorite.value || item.favorite
    const text = [item.name, item.brand, item.note, item.memo, item.material, item.primaryColor, ...(item.tags || [])].join(' ').toLowerCase()
    return archivedOk && categoryOk && seasonOk && favoriteOk && (!keyword || text.includes(keyword))
  })
  if (sortMode.value === 'oldest') result = [...result].sort((a, b) => a.createdAt - b.createdAt)
  if (sortMode.value === 'worn') result = [...result].sort((a, b) => (b.wearCount || 0) - (a.wearCount || 0))
  return result
})

const canvasCounts = computed(() => activeClothes.value.reduce((result, item) => {
  result[item.category] = (result[item.category] || 0) + 1
  result.all = (result.all || 0) + 1
  return result
}, {}))

const canvasItems = computed(() => activeClothes.value.filter((item) => canvasCategory.value === 'all' || item.category === canvasCategory.value))

const filteredOutfits = computed(() => outfits.value.filter((outfit) => {
  if (outfitListCategory.value === 'all') return true
  if (outfitListCategory.value === 'favorites') return Boolean(outfit.favorite)
  return outfit.itemIds.some((itemId) => clothesById.value[itemId]?.category === outfitListCategory.value)
}))
const favoriteOutfits = computed(() => outfits.value.filter((outfit) => outfit.favorite))

function outfitPreview(outfit) {
  const first = outfit.itemIds?.map((id) => clothesById.value[id]).find((item) => item?.coverImage)
  return first?.coverImage || ''
}

function outfitDisplayLayers(outfit) {
  if (outfit.layout && Object.keys(outfit.layout).length) {
    return outfit.itemIds
      .filter((itemId) => outfit.layout[String(itemId)])
      .map((itemId) => ({ itemId, ...outfit.layout[String(itemId)] }))
      .sort((left, right) => (left.z || 0) - (right.z || 0))
  }
  return outfit.itemIds.map((itemId, index) => ({
    itemId,
    x: index % 2 ? 71 : 29,
    y: index < 2 ? (index === 0 ? 26 : 62) : Math.min(86, 26 + index * 20),
    width: 46,
    rotation: 0,
    z: index + 1
  }))
}

function outfitLayoutLayers(outfit) {
  const entries = outfit.itemIds
    .map((itemId) => [itemId, outfit.layout?.[String(itemId)]])
    .filter(([, layout]) => layout)
    .map(([itemId, layout]) => ({ itemId, ...layout }))
  return entries.sort((left, right) => (left.z || 0) - (right.z || 0))
}

function clearCanvasSelection() {
  selectedLayerId.value = null
}

function editOutfitLayout(outfit) {
  if (!clothes.value.length) return
  const layout = outfit.layout || {}
  outfitDraft.value = {
    id: outfit.id,
    name: outfit.name,
    seasons: [...(outfit.seasons || [])],
    itemIds: [...(outfit.itemIds || [])],
    scene: outfit.scene || '',
    weather: outfit.weather || '',
    temperature: outfit.temperature || '',
    background: outfit.background || '#ffffff',
    layers: outfit.itemIds.filter((itemId) => layout[String(itemId)]).map((itemId, index) => ({
      uid: `edit-${outfit.id}-${itemId}`,
      itemId,
      src: clothesById.value[itemId]?.coverImage || '',
      ...layout[String(itemId)]
    }))
  }
  canvasCategory.value = 'all'
  selectedLayerId.value = null
  showDraftMeta.value = false
  outfitMode.value = 'draft'
}

const groupedClothes = computed(() => CATEGORIES.map((category) => ({
  ...category,
  items: filteredClothes.value.filter((item) => item.category === category.value)
})).filter((group) => group.items.length))

const monthLogCount = computed(() => wearLogs.value.filter((log) => log.date.startsWith(`${calendarYear.value}-${String(calendarMonth.value + 1).padStart(2, '0')}`)).length)
const monthActiveItems = computed(() => {
  const prefix = `${calendarYear.value}-${String(calendarMonth.value + 1).padStart(2, '0')}`
  const ids = new Set(wearLogs.value.filter((log) => log.date.startsWith(prefix) && log.itemId).map((log) => log.itemId))
  return clothes.value.filter((item) => ids.has(item.id))
})
const monthUnusedCount = computed(() => activeClothes.value.length - monthActiveItems.value.length)

const detailImages = computed(() => {
  if (!detailItem.value) return []
  return detailItem.value.images.map((image) => imageUrl(image))
})

async function refresh() {
  await repairImageRecords()
  const records = await db.clothes.orderBy('createdAt').reverse().toArray()
  clothes.value = records.map((item) => ({
    ...item,
    images: item.images || (item.image ? [item.image] : []),
    tags: item.tags || [],
    seasons: item.seasons || [],
    imageUrl: imageUrl(item.image)
  })).map((item) => ({ ...item, coverImage: imageUrl(item.images[0] || item.image) }))
  outfits.value = await db.outfits.orderBy('createdAt').reverse().toArray()
  wearLogs.value = await db.wearLogs.orderBy('date').reverse().toArray()
}

async function repairImageRecords() {
  const records = await db.clothes.toArray()
  await Promise.all(records.map(async (record) => {
    const normalized = await normalizeImages(record)
    if (normalized.changed) await db.clothes.update(record.id, { image: normalized.image, images: normalized.images })
  }))
}

function handlePrimaryAction() {
  if (activeTab.value === 'settings') handleExport()
  else if (activeTab.value === 'outfits') startOutfit()
  else openImport()
}

function openImport() { fileInput.value?.click() }

function clearImport() {
  stagedItems.value.forEach((item) => URL.revokeObjectURL(item.workUrl))
  stagedItems.value = []
  batchStatus.value = ''
  saveError.value = ''
  bulkBrand.value = ''
  bulkPrice.value = null
  if (fileInput.value) fileInput.value.value = ''
}

function handleCenterAdd() {
  if (activeTab.value === 'outfits' && clothes.value.length) startOutfit()
  else {
    activeTab.value = 'wardrobe'
    openImport()
  }
}

function goAddClothes() {
  outfitDraft.value = null
  outfitMode.value = 'list'
  activeTab.value = 'wardrobe'
  openImport()
}

function startOutfit() {
  if (!clothes.value.length) return
  outfitDraft.value = {
    name: '', seasons: [], itemIds: [], scene: '', weather: '', temperature: '',
    background: '#ffffff', layers: []
  }
  canvasCategory.value = 'all'
  selectedLayerId.value = null
  showDraftMeta.value = false
  outfitMode.value = 'draft'
}

function cancelOutfitDraft() {
  outfitDraft.value = null
  outfitMode.value = 'list'
}

function toggleSort() {
  sortMode.value = sortMode.value === 'newest' ? 'oldest' : sortMode.value === 'oldest' ? 'worn' : 'newest'
}

async function handleFiles(event) {
  const files = Array.from(event.target.files || [])
  if (!files.length) return
  const startIndex = stagedItems.value.length
  const records = await Promise.all(files.slice(0, 30).map(async (file, index) => {
    const bitmap = await createImageBitmap(file)
    return {
      key: `${Date.now()}-${index}`, original: file, originalName: file.name,
      workUrl: URL.createObjectURL(file), processed: false, error: false, image: null,
      width: bitmap.width, height: bitmap.height,
      name: `单品 ${String(startIndex + index + 1).padStart(2, '0')}`,
      category: 'top', seasons: [], note: ''
    }
  }))
  stagedItems.value.push(...records)
  if (fileInput.value) fileInput.value.value = ''
}

async function runCutout(item) {
  processingId.value = item.key
  item.error = false
  try {
    const blob = await removeBackground(item.original, { device: 'cpu', output: { format: 'image/png' } })
    URL.revokeObjectURL(item.workUrl)
    item.image = blob
    item.workUrl = URL.createObjectURL(blob)
    item.processed = true
    const bitmap = await createImageBitmap(blob)
    item.width = bitmap.width
    item.height = bitmap.height
    return true
  } catch (error) {
    console.error(error)
    item.error = true
    return false
  } finally {
    processingId.value = ''
  }
}

async function processCutout(item) {
  if (!await runCutout(item)) alert('这张图片识别失败，可以重试或直接用原图入库。')
}

async function batchCutout() {
  const queue = stagedItems.value.filter((item) => !item.processed)
  if (!queue.length) return
  let completed = 0
  let failed = 0
  for (const [index, item] of queue.entries()) {
    batchStatus.value = `处理中 ${index + 1}/${queue.length}`
    if (await runCutout(item)) completed += 1
    else failed += 1
  }
  batchStatus.value = failed ? `完成 ${completed} · 失败 ${failed}` : `完成 ${completed}`
  setTimeout(() => { batchStatus.value = '' }, 2200)
}

function toggleSeason(item, value) {
  item.seasons = item.seasons.includes(value) ? item.seasons.filter((season) => season !== value) : [...item.seasons, value]
}

async function saveItems() {
  saving.value = true
  saveError.value = ''
  try {
    const now = Date.now()
    const records = stagedItems.value.map((reactiveItem) => {
      const item = toRaw(reactiveItem)
      const image = item.image || item.original
      return {
        name: item.name || categoryLabel(item.category), category: item.category,
        seasons: [...item.seasons], color: '', material: '', primaryColor: '', secondaryColor: '',
        brand: bulkBrand.value || '', price: bulkPrice.value === '' || bulkPrice.value == null ? null : Number(bulkPrice.value),
        size: '', purchaseChannel: '', purchasedAt: '', tags: [], note: item.note || '', memo: '',
        image: null, images: [image], originalName: item.originalName || '',
        width: Number(item.width) || 0, height: Number(item.height) || 0, processed: Boolean(item.processed),
        favorite: false, archived: false, status: 'normal', wearCount: 0, lastWornAt: null,
        createdAt: now, updatedAt: now
      }
    })
    await db.clothes.bulkAdd(records)
    clearImport()
    await refresh()
  } catch (error) {
    console.error(error)
    saveError.value = '入库失败：本地数据库写入未完成，请重试一次。'
  } finally {
    saving.value = false
  }
}

function toggleOutfitSeason(value) {
  const seasons = outfitDraft.value.seasons
  outfitDraft.value.seasons = seasons.includes(value) ? seasons.filter((season) => season !== value) : [...seasons, value]
}

function layerStyle(layer) {
  return {
    left: `${layer.x}%`,
    top: `${layer.y}%`,
    width: `${layer.width}%`,
    transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`,
    zIndex: layer.z
  }
}

function addCanvasItem(item) {
  const draft = outfitDraft.value
  if (!draft) return
  const existing = draft.layers.find((layer) => layer.itemId === item.id)
  if (existing) {
    selectedLayerId.value = existing.uid
    return
  }
  const preset = { top: [50, 26, 40, 0], dress: [50, 38, 38, 0], outerwear: [50, 32, 42, 0], bottom: [50, 64, 40, 0], shoes: [50, 84, 28, 0], hat: [50, 7, 26, 0], accessory: [70, 12, 20, 0] }
  const [x, y, width, rotation] = preset[item.category] || [58, 50, 26, 0]
  const uid = `${Date.now()}-${draft.layers.length}`
  draft.layers.push({
    uid, itemId: item.id, src: item.coverImage, x, y, width,
    height: width, rotation, z: draft.layers.length + 1
  })
  if (!draft.itemIds.includes(item.id)) draft.itemIds.push(item.id)
  selectedLayerId.value = uid
}

function removeLayer(uid) {
  const draft = outfitDraft.value
  const layer = draft.layers.find((item) => item.uid === uid)
  draft.layers = draft.layers.filter((item) => item.uid !== uid)
  if (layer && !draft.layers.some((item) => item.itemId === layer.itemId)) {
    draft.itemIds = draft.itemIds.filter((id) => id !== layer.itemId)
  }
  selectedLayerId.value = null
}

function selectLayer(uid) {
  selectedLayerId.value = uid
  const draft = outfitDraft.value
  const maxZ = Math.max(0, ...draft.layers.map((layer) => layer.z))
  const layer = draft.layers.find((item) => item.uid === uid)
  if (layer) layer.z = maxZ + 1
}

function raiseLayer(uid) {
  const layer = outfitDraft.value.layers.find((item) => item.uid === uid)
  if (!layer) return
  const maxZ = Math.max(...outfitDraft.value.layers.map((item) => item.z))
  layer.z = maxZ + 1
}

function startHandle(event, uid, mode) {
  const layer = outfitDraft.value.layers.find((item) => item.uid === uid)
  const canvas = canvasRef.value
  if (!layer || !canvas) return
  event.preventDefault()
  selectLayer(uid)
  const rect = canvas.getBoundingClientRect()
  const startX = event.clientX
  const startY = event.clientY
  const startWidth = layer.width
  const startRotation = layer.rotation

  function move(pointerEvent) {
    const deltaX = pointerEvent.clientX - startX
    const deltaY = pointerEvent.clientY - startY
    if (mode === 'scale') {
      const distance = Math.max(deltaX, deltaY)
      layer.width = Math.min(96, Math.max(10, startWidth + distance / rect.width * 100))
      layer.height = layer.width
    } else {
      const centerX = rect.left + rect.width * layer.x / 100
      const centerY = rect.top + rect.height * layer.y / 100
      const startAngle = Math.atan2(startY - centerY, startX - centerX)
      const currentAngle = Math.atan2(pointerEvent.clientY - centerY, pointerEvent.clientX - centerX)
      layer.rotation = Math.round(startRotation + (currentAngle - startAngle) * 180 / Math.PI)
    }
  }

  function up() {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    window.removeEventListener('pointercancel', up)
  }

  window.addEventListener('pointermove', move, { passive: true })
  window.addEventListener('pointerup', up)
  window.addEventListener('pointercancel', up)
}

function startCanvasDrag(event, uid) {
  const layer = outfitDraft.value.layers.find((item) => item.uid === uid)
  const canvas = canvasRef.value
  if (!layer || !canvas) return
  selectLayer(uid)
  const rect = canvas.getBoundingClientRect()
  const startX = event.clientX
  const startY = event.clientY
  const startXPercent = layer.x
  const startYPercent = layer.y

  function move(pointerEvent) {
    layer.x = Math.min(96, Math.max(4, startXPercent + (pointerEvent.clientX - startX) / rect.width * 100))
    layer.y = Math.min(96, Math.max(4, startYPercent + (pointerEvent.clientY - startY) / rect.height * 100))
  }

  function up() {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    window.removeEventListener('pointercancel', up)
  }

  window.addEventListener('pointermove', move, { passive: true })
  window.addEventListener('pointerup', up)
  window.addEventListener('pointercancel', up)
}

async function saveOutfit() {
  if (!outfitDraft.value?.layers.length) return
  outfitSaveMeta.value = {
    name: outfitDraft.value.name || '',
    scene: outfitDraft.value.scene || '',
    seasons: [...outfitDraft.value.seasons],
    weather: outfitDraft.value.weather || '',
    temperature: outfitDraft.value.temperature || ''
  }
}

function toggleOutfitSaveSeason(value) {
  const seasons = outfitSaveMeta.value.seasons
  outfitSaveMeta.value.seasons = seasons.includes(value) ? seasons.filter((season) => season !== value) : [...seasons, value]
}

async function confirmSaveOutfit() {
  saving.value = true
  saveError.value = ''
  try {
    const now = Date.now()
    const meta = toRaw(outfitSaveMeta.value)
    const name = meta.name || `搭配 ${formatDate(now)}`
    const draft = toRaw(outfitDraft.value)
    const record = {
      name, seasons: [...meta.seasons], itemIds: [...draft.itemIds],
      scene: meta.scene || '', weather: meta.weather || '', temperature: meta.temperature || '',
      background: draft.background || '#ffffff',
      layout: Object.fromEntries(draft.layers.map((layer) => [String(layer.itemId), {
        x: layer.x, y: layer.y, width: layer.width, height: layer.height,
        rotation: layer.rotation, z: layer.z
      }])),
      styleTags: [], note: '', favorite: false, wearCount: 0, createdAt: now, updatedAt: now
    }
    let saved
    if (draft.id) {
      const existing = await db.outfits.get(draft.id)
      await db.outfits.update(draft.id, {
        ...record,
        favorite: existing?.favorite || false,
        wearCount: existing?.wearCount || 0,
        createdAt: existing?.createdAt || now
      })
      saved = await db.outfits.get(draft.id)
    } else {
      await db.outfits.add(record)
      saved = await db.outfits.where('createdAt').equals(now).first()
    }
    outfitSaveMeta.value = null
    await refresh()
    if (saved) await openOutfitResult(saved)
    outfitDraft.value = null
    outfitMode.value = 'list'
  } catch (error) {
    console.error(error)
    saveError.value = '保存失败：本地数据库写入未完成，请重试一次。'
  } finally {
    saving.value = false
  }
}

async function openOutfitResult(outfit) {
  const source = toRaw(outfit)
    const blob = await buildOutfitImage(source, clothesById.value, source.createdAt)
  outfitResult.value = {
    id: source.id,
    name: source.name,
    url: URL.createObjectURL(blob),
    blob
  }
}

function closeOutfitResult() {
  if (outfitResult.value?.url) URL.revokeObjectURL(outfitResult.value.url)
  outfitResult.value = null
}

function downloadOutfitResult() {
  if (!outfitResult.value) return
  const url = URL.createObjectURL(outfitResult.value.blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${outfitResult.value.name}_${todayKey()}.png`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1200)
}

function continueOutfitDraft() {
  closeOutfitResult()
  outfitMode.value = 'list'
}

function outfitMeta(outfit) {
  const parts = [seasonText(outfit.seasons)]
  if (outfit.scene) parts.push(outfit.scene)
  if (outfit.temperature) parts.push(outfit.temperature)
  return parts.filter(Boolean).join(' · ') + ` · 穿过 ${outfit.wearCount || 0} 次`
}

async function openDetail(item) {
  detailImageIndex.value = 0
  const images = item.images.length ? [...item.images] : (item.image ? [item.image] : [])
  detailItem.value = { ...item, images }
}

function closeDetail() { detailItem.value = null }

const detailCarouselIndex = computed(() => Math.min(detailImageIndex.value, Math.max(detailImages.value.length - 1, 0)))

function previousImage() { detailImageIndex.value = (detailCarouselIndex.value + detailImages.value.length - 1) % detailImages.value.length }
function nextImage() { detailImageIndex.value = (detailCarouselIndex.value + 1) % detailImages.value.length }

function deleteDetailImage() {
  detailItem.value.images.splice(detailCarouselIndex.value, 1)
  detailImageIndex.value = Math.max(0, detailCarouselIndex.value - 1)
}

async function addDetailImages(event) {
  const files = Array.from(event.target.files || [])
  if (!files.length || !detailItem.value) return
  detailItem.value.images.push(...files)
  if (event.target) event.target.value = ''
}

async function replaceDetailImage(event) {
  const file = event.target.files?.[0]
  if (!file || !detailItem.value) return
  detailItem.value.images.splice(detailCarouselIndex.value, 1, file)
  if (event.target) event.target.value = ''
}

function setDetailCover(index) {
  const images = detailItem.value.images
  if (index <= 0 || index >= images.length) return
  const [selected] = images.splice(index, 1)
  images.unshift(selected)
  detailImageIndex.value = 0
}

function toggleDetailSeason(value) {
  const seasons = detailItem.value.seasons
  detailItem.value.seasons = seasons.includes(value) ? seasons.filter((season) => season !== value) : [...seasons, value]
}

function toggleDetailTag(tag) {
  const tags = detailItem.value.tags
  detailItem.value.tags = tags.includes(tag) ? tags.filter((item) => item !== tag) : [...tags, tag]
}

function addDetailTag() {
  if (newTag.value && !detailItem.value.tags.includes(newTag.value)) detailItem.value.tags.push(newTag.value)
  newTag.value = ''
}

async function saveDetail() {
  saving.value = true
  const item = toRaw(detailItem.value)
  const images = (await Promise.all(item.images.map((image) => dataUrlFromImage(image)))).filter(Boolean)
  if (!images.length && !confirm('这件单品没有任何有效图片，确定继续保存吗？')) {
    saving.value = false
    return
  }
  const data = {
    name: item.name, category: item.category, seasons: [...item.seasons], status: item.status,
    archived: Boolean(item.archived), favorite: Boolean(item.favorite),
    brand: item.brand || '', size: item.size || '', price: item.price == null ? null : Number(item.price),
    material: item.material || '', primaryColor: item.primaryColor || '', secondaryColor: item.secondaryColor || '',
    purchasedAt: item.purchasedAt || '', purchaseChannel: item.purchaseChannel || '',
    tags: [...item.tags], memo: item.memo || '', note: item.note || '',
    image: images[0] || null, images, updatedAt: Date.now()
  }
  try {
    await db.clothes.update(item.id, data)
    closeDetail()
    await refresh()
  } catch (error) {
    console.error(error)
    const reason = error?.message ? `（${error.message}）` : ''
    alert(`保存失败：图片或资料没有写入本地数据库${reason}。请重试。`)
  } finally {
    saving.value = false
  }
}

async function recordCurrentItemForPendingDate() {
  const item = toRaw(detailItem.value)
  if (!item) return
  if (!pendingWearDate.value) {
    await saveDetail()
    return
  }
  const date = pendingWearDate.value
  await saveDetail()
  await addWearLogForDate(date, item.id, null)
  pendingWearDate.value = null
  activeTab.value = 'calendar'
  openDateLog(date)
}

async function deleteClothes(item) {
  if (!confirm(`删除「${item.name}」？搭配中的引用会显示为已删除。`)) return
  await db.clothes.delete(item.id)
  closeDetail()
  await refresh()
}

async function toggleFavorite(item) {
  await db.clothes.update(item.id, { favorite: !item.favorite, updatedAt: Date.now() })
  await refresh()
}

async function recordItemWear(item) {
  const before = toRaw(detailItem.value)
  const saved = await db.clothes.get(item.id)
  if (saved && (
    before.name !== saved.name ||
    before.brand !== saved.brand ||
    before.memo !== saved.memo ||
    before.images.length !== (saved.images || []).length
  )) {
    await saveDetail()
  }
  const current = await db.clothes.get(item.id)
  const today = new Date().toISOString().slice(0, 10)
  await db.transaction('rw', [db.clothes, db.wearLogs], async () => {
    await db.wearLogs.add({ date: today, itemId: item.id, outfitId: null, createdAt: Date.now() })
    await db.clothes.update(item.id, { wearCount: (current?.wearCount || 0) + 1, lastWornAt: Date.now(), updatedAt: Date.now() })
  })
  closeDetail()
  await refresh()
}

async function openOutfitDetail(outfit) {
  detailOutfit.value = { ...outfit, layout: outfit.layout || {}, background: outfit.background || '#ffffff' }
  outfitRecordDate.value = todayKey()
}

function closeOutfitDetail() { detailOutfit.value = null }

async function logOutfitDetailDate() {
  const date = outfitRecordDate.value || new Date().toISOString().slice(0, 10)
  const outfitId = toRaw(detailOutfit.value).id
  await addWearLogForDate(date, null, outfitId)
  closeOutfitDetail()
  activeTab.value = 'calendar'
  openDateLog(date)
  outfitRecordDate.value = new Date().toISOString().slice(0, 10)
}

function openSuggestions() {
  outfitMode.value = 'suggest'
  outfitDraft.value = null
  if (!suggestions.value.length) generateSuggestions()
}

function generateSuggestions() {
  suggestions.value = suggestOutfits(clothes.value, {
    scene: suggestOptions.scene,
    temperature: suggestOptions.temperature
  })
  suggestionMessage.value = suggestions.value.length
    ? '全部在本机计算，只基于分类、季节、场景和穿着频次。'
    : '单品还不够，先补齐上衣/下装/连衣裙和鞋子，再生成建议。'
}

async function useSuggestion(suggestion) {
  const timestamp = Date.now()
  await db.outfits.add({
    name: suggestion.name,
    seasons: [...suggestion.seasons],
    itemIds: [...suggestion.itemIds],
    scene: suggestion.scene || '',
    weather: '',
    temperature: suggestOptions.temperature || '',
    styleTags: [],
    note: '',
    favorite: false,
    wearCount: 0,
    createdAt: timestamp,
    updatedAt: timestamp
  })
  outfitMode.value = 'list'
  await refresh()
}

async function duplicateOutfit(outfit) {
  const timestamp = Date.now()
  const source = toRaw(outfit)
  const { id, ...rest } = source
  await db.outfits.add({
    ...rest,
    name: `${source.name} 副本`,
    wearCount: 0,
    favorite: false,
    createdAt: timestamp,
    updatedAt: timestamp
  })
  await refresh()
}

async function exportDetailOutfitImage() {
  try {
    await exportOutfitImage(toRaw(detailOutfit.value), clothesById.value)
  } catch (error) {
    console.error(error)
    alert(error.message || '搭配图导出失败')
  }
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function formatChineseDate(date) {
  const value = new Date(`${date}T12:00:00`)
  return Number.isNaN(value.getTime()) ? date : `${value.getMonth() + 1} 月 ${value.getDate()} 日`
}

function formatFullChineseDate(date) {
  const value = new Date(`${date}T12:00:00`)
  return Number.isNaN(value.getTime()) ? date : `${value.getFullYear()} 年 ${value.getMonth() + 1} 月 ${value.getDate()} 日`
}

async function handleExcelExport() {
  excelMessage.value = ''
  try {
    const count = await exportClothesExcel()
    excelMessage.value = `已导出 ${count} 件单品资料。`
  } catch (error) {
    console.error(error)
    excelMessage.value = 'Excel 导出失败，请重试。'
  }
}

async function handleExcelImport(event) {
  const file = event.target.files?.[0]
  if (!file) return
  excelMessage.value = ''
  try {
    const count = await importClothesExcel(file)
    await refresh()
    excelMessage.value = `已导入 ${count} 行单品资料。`
  } catch (error) {
    console.error(error)
    excelMessage.value = error.message || 'Excel 导入失败：请使用本应用导出的表头。'
  } finally {
    if (excelInput.value) excelInput.value.value = ''
  }
}

function toggleDetailOutfitSeason(value) {
  const seasons = detailOutfit.value.seasons
  detailOutfit.value.seasons = seasons.includes(value) ? seasons.filter((season) => season !== value) : [...seasons, value]
}

async function saveOutfitDetail() {
  savingOutfitDetail.value = true
  const outfit = toRaw(detailOutfit.value)
  try {
    await db.outfits.update(outfit.id, {
      name: outfit.name, seasons: [...outfit.seasons], scene: outfit.scene || '',
      weather: outfit.weather || '', temperature: outfit.temperature || '',
      background: outfit.background || '#ffffff',
      layout: outfit.layout || {}, updatedAt: Date.now()
    })
    closeOutfitDetail()
    await refresh()
  } catch (error) {
    console.error(error)
    alert('保存失败：搭配信息没有写入本地数据库，请重试。')
  } finally {
    savingOutfitDetail.value = false
  }
}

async function toggleOutfitFavorite(outfit) {
  await db.outfits.update(outfit.id, { favorite: !outfit.favorite, updatedAt: Date.now() })
  await refresh()
}

async function recordOutfitWear(outfit) {
  await addWearLogForDate(new Date().toISOString().slice(0, 10), null, toRaw(outfit).id)
  closeOutfitDetail()
  await refresh()
}

function discardDetail() {
  detailItem.value = null
  detailImageIndex.value = 0
}

async function deleteOutfit(outfit) {
  if (!confirm(`删除「${outfit.name}」？单品不会删除。`)) return
  await db.outfits.delete(outfit.id)
  closeOutfitDetail()
  await refresh()
}

function openDateLog(date) {
  const entries = wearLogs.value.filter((log) => log.date === date).map((log) => {
    if (log.itemId) {
      const item = clothesById.value[log.itemId]
      return {
        id: log.id,
        type: 'single',
        targetId: log.itemId,
        title: item?.name || '单品已删除',
        subtitle: item ? categoryLabel(item.category) : '单品',
        image: item?.coverImage || '',
        clickable: Boolean(item)
      }
    }
    const outfit = outfitsById.value[log.outfitId]
    return {
      id: log.id,
      type: 'outfit',
      targetId: log.outfitId,
      title: outfit?.name || '搭配已删除',
      subtitle: outfit ? outfitMeta(outfit) : '搭配',
      image: outfit ? outfitPreview(outfit) : '',
      clickable: Boolean(outfit)
    }
  })
  dateLog.value = { date, entries, picker: '', selectedIds: [] }
}

function openDateLogEntry(entry) {
  dateLog.value = null
  if (entry.type === 'single') {
    activeTab.value = 'wardrobe'
    const item = clothes.value.find((clothesItem) => clothesItem.id === entry.targetId)
    if (item) openDetail(item)
    return
  }
  const outfit = outfits.value.find((outfitItem) => outfitItem.id === entry.targetId)
  if (outfit) {
    activeTab.value = 'outfits'
    outfitMode.value = 'list'
    openOutfitDetail(outfit)
  }
}

function navigateCalendar(direction) {
  const date = new Date(calendarYear.value, calendarMonth.value + direction, 1)
  calendarYear.value = date.getFullYear()
  calendarMonth.value = date.getMonth()
}

async function addWearLogForDate(date, itemId = null, outfitId = null) {
  const wornAt = new Date(`${date}T12:00:00`).getTime()
  await db.transaction('rw', [db.clothes, db.outfits, db.wearLogs], async () => {
    await db.wearLogs.add({ date, itemId, outfitId, createdAt: Date.now() })
    if (itemId) {
      const item = await db.clothes.get(itemId)
      if (item) await db.clothes.update(itemId, { wearCount: (item.wearCount || 0) + 1, lastWornAt: wornAt, updatedAt: Date.now() })
    }
    if (outfitId) {
      const outfit = await db.outfits.get(outfitId)
      if (outfit) {
        await db.outfits.update(outfitId, { wearCount: (outfit.wearCount || 0) + 1, updatedAt: Date.now() })
        for (const id of outfit.itemIds) {
          const item = await db.clothes.get(id)
          if (item) await db.clothes.update(id, { wearCount: (item.wearCount || 0) + 1, lastWornAt: wornAt, updatedAt: Date.now() })
        }
      }
    }
  })
  await refresh()
}

function startDatePicker(type) {
  dateLog.value = {
    ...dateLog.value,
    picker: type,
    selectedIds: []
  }
}

function toggleDateSelection(id) {
  const selected = dateLog.value.selectedIds
  dateLog.value.selectedIds = selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id]
}

async function confirmDateSelection() {
  if (!dateLog.value?.selectedIds.length) return
  const date = dateLog.value.date
  const selected = [...dateLog.value.selectedIds]
  for (const id of selected) {
    if (dateLog.value.picker === 'single') await addWearLogForDate(date, id, null)
    else await addWearLogForDate(date, null, id)
  }
  pendingWearDate.value = null
  await openDateLog(date)
}

async function loadSettings() {
  const values = await db.settings.get('app')
  if (values) Object.assign(settings, values.value || {})
  showArchived.value = !settings.hideArchived
  viewMode.value = settings.defaultGrid ? 'grid' : 'list'
}

async function saveSettings() {
  await db.settings.put({ key: 'app', value: { ...settings } })
  showArchived.value = !settings.hideArchived
  viewMode.value = settings.defaultGrid ? 'grid' : 'list'
}

async function handleExport() {
  backupBusy.value = true
  backupMessage.value = ''
  try {
    await exportBackup()
    backupMessage.value = '备份已导出，请在手机文件或下载列表中保存。'
  } catch (error) {
    console.error(error)
    backupMessage.value = '导出失败，请重试。'
  } finally {
    backupBusy.value = false
  }
}

async function handleBackupImport(event) {
  const file = event.target.files?.[0]
  if (!file) return
  backupBusy.value = true
  backupMessage.value = ''
  try {
    const result = await importBackup(file)
    await refresh()
    backupMessage.value = `导入完成：${result.clothes} 件单品 / ${result.outfits} 套搭配。`
  } catch (error) {
    console.error(error)
    backupMessage.value = '导入失败：请确认这是本应用导出的备份文件。'
  } finally {
    backupBusy.value = false
    if (backupInput.value) backupInput.value.value = ''
  }
}

onMounted(async () => {
  await loadSettings()
  await refresh()
})
</script>
