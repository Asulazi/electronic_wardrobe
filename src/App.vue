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
      <button class="icon-action" type="button" @click="handlePrimaryAction">
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

        <div v-if="filteredClothes.length" class="list-meta"><span>共 {{ filteredClothes.length }} 件</span></div>

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

        <section v-else-if="!filteredClothes.length" class="empty">
          <Shirt />
          <h2>{{ clothes.length ? '没有匹配单品' : '衣橱还是空的' }}</h2>
          <p>{{ clothes.length ? '换个筛选或关键词试试。' : '拍照或从相册添加，支持一件多图和本地抠图。' }}</p>
          <button class="primary-action" type="button" @click="openImport">添加单品</button>
        </section>

        <template v-else>
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

          <section v-else-if="viewMode === 'grouped'" class="grouped-view">
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

          <section v-else class="list-view">
            <button v-for="item in filteredClothes" :key="item.id" type="button" class="list-row" @click="openDetail(item)">
              <img v-if="item.coverImage" :src="item.coverImage" alt="" />
              <Shirt v-else />
              <span class="list-main"><strong>{{ item.name }}</strong><small>{{ categoryLabel(item.category) }} · 穿过 {{ item.wearCount || 0 }} 次</small></span>
              <ChevronRight />
            </button>
          </section>
        </template>
      </section>

      <section v-if="activeTab === 'outfits'" class="view">
        <div class="rail">
          <button type="button" class="pill" :class="{ active: outfitMode === 'list' }" @click="outfitMode = 'list'">搭配册</button>
          <button type="button" class="pill" :class="{ active: outfitMode === 'draft' }" @click="outfitMode = outfitDraft ? 'draft' : 'list'; if (clothes.length) startOutfit()">DIY 拼搭</button>
        </div>

        <section v-if="outfitDraft && !clothes.length" class="panel">
          <header class="panel-header"><div><span class="kicker">创建搭配</span><h2>先添加单品</h2></div><button class="icon-action subtle" type="button" @click="outfitDraft = null"><X /></button></header>
          <p class="guide-text">搭配需要从衣橱选择单品。先添加衣服、鞋帽或配饰。</p>
          <button class="primary-action" type="button" @click="goAddClothes">去衣橱添加</button>
        </section>

        <section v-else-if="outfitDraft" class="panel">
          <header class="panel-header"><div><span class="kicker">DIY 搭配</span><h2>选择单品</h2></div><button class="icon-action subtle" type="button" @click="cancelOutfitDraft"><X /></button></header>
          <input v-model.trim="outfitDraft.name" class="input" type="text" placeholder="搭配名称" />
          <div class="field-label">适用场景</div>
          <div class="tag-picker">
            <button v-for="scene in SCENES" :key="scene" type="button" class="tag" :class="{ active: outfitDraft.scene === scene }" @click="outfitDraft.scene = outfitDraft.scene === scene ? '' : scene">{{ scene }}</button>
          </div>
          <div class="season-picker">
            <button v-for="season in SEASONS" :key="season.value" type="button" class="season" :class="{ active: outfitDraft.seasons.includes(season.value) }" @click="toggleOutfitSeason(season.value)">{{ season.label }}</button>
          </div>
          <div class="weather-row">
            <input v-model.trim="outfitDraft.weather" class="input" type="text" placeholder="天气：晴 / 雨" />
            <input v-model.trim="outfitDraft.temperature" class="input" type="text" inputmode="numeric" placeholder="温度：20℃" />
          </div>
          <p class="selection-count">已选 {{ outfitDraft.itemIds.length }} 件</p>
          <div class="choice-grid">
            <button v-for="item in clothes" :key="item.id" type="button" class="choice" :class="{ selected: outfitDraft.itemIds.includes(item.id) }" @click="toggleOutfitItem(item.id)">
              <img v-if="item.coverImage" :src="item.coverImage" alt="" />
              <Shirt v-else />
              <span>{{ item.name }}</span>
            </button>
          </div>
          <button class="primary-action" type="button" :disabled="!outfitDraft.itemIds.length || saving" @click="saveOutfit">保存搭配</button>
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
            <article v-for="outfit in outfits" :key="outfit.id" class="outfit-card">
              <header>
                <div>
                  <button class="product-title" type="button" @click="openOutfitDetail(outfit)">{{ outfit.name }}</button>
                  <span>{{ outfitMeta(outfit) }}</span>
                </div>
                <button class="icon-action subtle" type="button" @click="toggleOutfitFavorite(outfit)"><Heart :class="{ filled: outfit.favorite }" /></button>
              </header>
              <div class="choice-grid">
                <div v-for="itemId in outfit.itemIds" :key="itemId" class="choice static">
                  <img v-if="clothesById[itemId]?.coverImage" :src="clothesById[itemId].coverImage" alt="" />
                  <Shirt v-else />
                  <span>{{ clothesById[itemId]?.name || '已删除' }}</span>
                </div>
              </div>
              <div class="outfit-actions"><button class="secondary-action" type="button" @click="openOutfitDetail(outfit)">详情 / 记录</button></div>
            </article>
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
        />
        <section class="panel">
          <header class="panel-header"><div><span class="kicker">本页统计</span><h2>{{ calendarYear }} 年 {{ calendarMonth + 1 }} 月</h2></div></header>
          <div class="profile-stats">
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

    <div v-if="detailItem" class="sheet-backdrop" @click="closeDetail">
      <section class="sheet" @click.stop>
        <header class="sheet-header">
          <div><span class="kicker">单品详情</span><h2>{{ detailItem.name }}</h2></div>
          <button class="icon-action subtle" type="button" @click="closeDetail"><X /></button>
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
        <button class="primary-action image-save" type="button" :disabled="saving" @click="saveDetail">保存图片与资料修改</button>
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
        <div class="detail-actions">
          <button class="primary-action" type="button" @click="recordItemWear(detailItem)">记录今天穿着</button>
          <button class="secondary-action full" type="button" @click="saveDetail">保存修改</button>
          <button class="danger-action" type="button" @click="deleteClothes(detailItem)">删除单品</button>
        </div>
      </section>
    </div>

    <div v-if="detailOutfit" class="sheet-backdrop" @click="closeOutfitDetail">
      <section class="sheet" @click.stop>
        <header class="sheet-header">
          <div><span class="kicker">搭配详情</span><h2>{{ detailOutfit.name }}</h2></div>
          <button class="icon-action subtle" type="button" @click="closeOutfitDetail"><X /></button>
        </header>
        <div class="choice-grid">
          <div v-for="itemId in detailOutfit.itemIds" :key="itemId" class="choice static">
            <img v-if="clothesById[itemId]?.coverImage" :src="clothesById[itemId].coverImage" alt="" />
            <Shirt v-else />
            <span>{{ clothesById[itemId]?.name || '已删除' }}</span>
          </div>
        </div>
        <label><span class="field-label">名称</span><input v-model.trim="detailOutfit.name" class="input" type="text" /></label>
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
        <div class="detail-actions">
          <button class="primary-action" type="button" @click="recordOutfitWear(detailOutfit)">记录今天穿着</button>
          <button class="secondary-action full" type="button" @click="saveOutfitDetail">保存修改</button>
          <button class="danger-action" type="button" @click="deleteOutfit(detailOutfit)">删除搭配</button>
        </div>
      </section>
    </div>

    <div v-if="dateLog" class="sheet-backdrop" @click="dateLog = null">
      <section class="sheet" @click.stop>
        <header class="sheet-header">
          <div><span class="kicker">穿搭记录</span><h2>{{ dateLog.date }}</h2></div>
          <button class="icon-action subtle" type="button" @click="dateLog = null"><X /></button>
        </header>
        <div v-if="dateLog.entries.length" class="date-log-list">
          <article v-for="entry in dateLog.entries" :key="entry.id" class="date-log-item">
            <strong>{{ entry.title }}</strong>
            <span>{{ entry.subtitle }}</span>
          </article>
        </div>
        <p v-else class="guide-text">这一天还没有记录。</p>
      </section>
    </div>

    <input ref="fileInput" class="hidden-input" type="file" accept="image/*" multiple @change="handleFiles" />
    <input ref="backupInput" class="hidden-input" type="file" accept="application/json,.json" @change="handleBackupImport" />

    <nav class="bottom-nav" aria-label="主导航">
      <button type="button" :class="{ active: activeTab === 'wardrobe' }" @click="activeTab = 'wardrobe'"><Shirt /><span>衣橱</span></button>
      <button type="button" :class="{ active: activeTab === 'outfits' }" @click="activeTab = 'outfits'"><Layers /><span>搭配册</span></button>
      <button class="center-add" type="button" @click="handleCenterAdd"><Plus /></button>
      <button type="button" :class="{ active: activeTab === 'calendar' }" @click="activeTab = 'calendar'"><CalendarDays /><span>日历</span></button>
      <button type="button" :class="{ active: activeTab === 'stats' }" @click="activeTab = 'stats'"><ChartColumn /><span>统计</span></button>
    </nav>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, toRaw } from 'vue'
import { removeBackground } from '@imgly/background-removal'
import {
  Archive, ArrowDownUp, CalendarDays, ChartColumn, ChevronLeft, ChevronRight, Heart,
  ImagePlus, Layers, Plus, ScanLine, Search, ShieldCheck, Shirt, Sparkles, Star, X
} from 'lucide-vue-next'
import WearCalendar from './components/WearCalendar.vue'
import WearStats from './components/WearStats.vue'
import { exportBackup, importBackup } from './backup'
import { db } from './db'
import { blobUrl, normalizeImages } from './images'
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
const now = new Date()
const calendarYear = ref(now.getFullYear())
const calendarMonth = ref(now.getMonth())
const settings = reactive({ hideArchived: true, defaultGrid: true, showPrice: true })

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
  return detailItem.value.images.map((blob) => blobUrl(blob))
})

async function refresh() {
  await repairImageRecords()
  const records = await db.clothes.orderBy('createdAt').reverse().toArray()
  clothes.value = records.map((item) => ({
    ...item,
    images: item.images || (item.image ? [item.image] : []),
    tags: item.tags || [],
    seasons: item.seasons || [],
    imageUrl: blobUrl(item.image)
  })).map((item) => ({ ...item, coverImage: blobUrl(item.images[0] || item.image) }))
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
  outfitDraft.value = { name: '', seasons: [], itemIds: [], scene: '', weather: '', temperature: '' }
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
        image, images: [image], originalName: item.originalName || '',
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

function toggleOutfitItem(itemId) {
  const itemIds = outfitDraft.value.itemIds
  outfitDraft.value.itemIds = itemIds.includes(itemId) ? itemIds.filter((id) => id !== itemId) : [...itemIds, itemId]
}

async function saveOutfit() {
  saving.value = true
  saveError.value = ''
  try {
    const now = Date.now()
    const draft = toRaw(outfitDraft.value)
    await db.outfits.add({
      name: draft.name || '未命名搭配', seasons: [...draft.seasons], itemIds: [...draft.itemIds],
      scene: draft.scene || '', weather: draft.weather || '', temperature: draft.temperature || '',
      styleTags: [], note: '', favorite: false, wearCount: 0, createdAt: now, updatedAt: now
    })
    cancelOutfitDraft()
    await refresh()
  } catch (error) {
    console.error(error)
    saveError.value = '保存失败：本地数据库写入未完成，请重试一次。'
  } finally {
    saving.value = false
  }
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
  const item = toRaw(detailItem.value)
  const images = item.images.filter((image) => image instanceof Blob && image.size > 0)
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
    alert('保存失败：图片或资料没有写入本地数据库，请重试。')
  }
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
  const today = new Date().toISOString().slice(0, 10)
  await db.transaction('rw', [db.clothes, db.wearLogs], async () => {
    await db.wearLogs.add({ date: today, itemId: item.id, outfitId: null, createdAt: Date.now() })
    await db.clothes.update(item.id, { wearCount: (item.wearCount || 0) + 1, lastWornAt: Date.now(), updatedAt: Date.now() })
  })
  closeDetail()
  await refresh()
}

async function openOutfitDetail(outfit) { detailOutfit.value = { ...outfit } }
function closeOutfitDetail() { detailOutfit.value = null }

function toggleDetailOutfitSeason(value) {
  const seasons = detailOutfit.value.seasons
  detailOutfit.value.seasons = seasons.includes(value) ? seasons.filter((season) => season !== value) : [...seasons, value]
}

async function saveOutfitDetail() {
  const outfit = toRaw(detailOutfit.value)
  await db.outfits.update(outfit.id, {
    name: outfit.name, seasons: [...outfit.seasons], scene: outfit.scene || '',
    weather: outfit.weather || '', temperature: outfit.temperature || '', updatedAt: Date.now()
  })
  closeOutfitDetail()
  await refresh()
}

async function toggleOutfitFavorite(outfit) {
  await db.outfits.update(outfit.id, { favorite: !outfit.favorite, updatedAt: Date.now() })
  await refresh()
}

async function recordOutfitWear(outfit) {
  const today = new Date().toISOString().slice(0, 10)
  await db.transaction('rw', [db.outfits, db.wearLogs, db.clothes], async () => {
    await db.wearLogs.add({ date: today, itemId: null, outfitId: outfit.id, createdAt: Date.now() })
    await db.outfits.update(outfit.id, { wearCount: (outfit.wearCount || 0) + 1, updatedAt: Date.now() })
    for (const itemId of outfit.itemIds) {
      const item = clothesById.value[itemId]
      if (item) await db.clothes.update(itemId, { wearCount: (item.wearCount || 0) + 1, lastWornAt: Date.now(), updatedAt: Date.now() })
    }
  })
  closeOutfitDetail()
  await refresh()
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
      return { id: log.id, title: item?.name || '单品已删除', subtitle: item ? categoryLabel(item.category) : '单品' }
    }
    const outfit = outfitsById.value[log.outfitId]
    return { id: log.id, title: outfit?.name || '搭配已删除', subtitle: outfit ? outfitMeta(outfit) : '搭配' }
  })
  dateLog.value = { date, entries }
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
