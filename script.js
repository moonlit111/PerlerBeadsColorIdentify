// 检查colors.js是否已加载
(function() {
    'use strict';
    
    // 等待colors.js加载
    function init() {
        if (typeof window.mard221Colors === 'undefined') {
            console.error('colors.js未正确加载，请刷新页面重试');
            setTimeout(init, 100); // 100ms后重试
            return;
        }
        
        console.log('colors.js已加载，开始初始化...');
    // 当前选择的色号系统
    let currentColorSystem = localStorage.getItem('colorSystem') || 'MARD';

    // 从全局作用域获取颜色数据
    const mard221Colors = window.mard221Colors;
    const getAllColors = window.getAllColors;
    const findClosestColors = window.findClosestColors;
    const colorDistance = window.colorDistance;
    const colorSimilarity = window.colorSimilarity;
    const colorCodeMapping = window.colorCodeMapping;
    const getSelectedColorIds = window.getSelectedColorIds;
    const saveSelectedColorIds = window.saveSelectedColorIds;
    const getColorCodeBySystem = window.getColorCodeBySystem;
    const getDisplayId = window.getDisplayId;
    const getGroupBySystem = window.getGroupBySystem;
    const normalizeColorId = window.normalizeColorId;

    // ========== 工具函数 ==========
    // 格式化显示ID（处理null和"/"的情况）
    function formatDisplayId(color, includeName = true) {
        const displayId = getDisplayId(color, currentColorSystem);
        let displayText;
        if (displayId === null) {
            // 如果该颜色在当前系统中没有映射，显示MARD色号
            displayText = color.id;
        } else {
            displayText = displayId;
            // 如果包含 "/" 则显示两个色号
            if (displayText.includes('/')) {
                displayText = displayText.replace('/', ' / ');
            }
        }
        return displayText + (includeName && color.name ? ` (${color.name})` : '');
    }

    // 过滤已选颜色（考虑标准化ID）
    function filterSelectedColors(colors, excludeId = null) {
        const selectedIds = getSelectedColorIds();
        if (selectedIds.size === 0) {
            return excludeId ? colors.filter(c => c.id !== excludeId) : colors;
        }
        return colors.filter(c => {
            if (excludeId && c.id === excludeId) return false;
            const normalizedId = normalizeColorId(c.id);
            return selectedIds.has(c.id) || selectedIds.has(normalizedId);
        });
    }

    // 显示匹配颜色列表
    function renderMatchedColorsList(closestColors, container) {
        container.innerHTML = '';
        closestColors.forEach((colorData, index) => {
            const item = document.createElement('div');
            item.className = 'matched-color-item' + (index === 0 ? ' best-match' : '');
            
            const colorBox = document.createElement('div');
            colorBox.className = 'matched-color-box';
            colorBox.style.backgroundColor = colorData.hex;
            
            const info = document.createElement('div');
            info.className = 'matched-color-info';
            
            const id = document.createElement('div');
            id.className = 'matched-color-id';
            id.textContent = formatDisplayId(colorData);
            
            const values = document.createElement('div');
            values.className = 'matched-color-values';
            values.innerHTML = `
                HEX: <span>${colorData.hex}</span><br>
                RGB: <span>(${colorData.rgb.r}, ${colorData.rgb.g}, ${colorData.rgb.b})</span>
            `;
            
            const similarity = document.createElement('div');
            similarity.className = 'similarity-badge';
            similarity.textContent = `相似度: ${colorData.similarity}%`;
            
            info.appendChild(id);
            info.appendChild(values);
            info.appendChild(similarity);
            
            item.appendChild(colorBox);
            item.appendChild(info);
            
            container.appendChild(item);
        });
    }

    // ========== 工具切换 ==========
    const navButtons = document.querySelectorAll('.nav-btn');
    const toolSections = document.querySelectorAll('.tool-section');

navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const tool = btn.dataset.tool;
        
        // 更新导航按钮状态
        navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // 更新工具区域显示
        toolSections.forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`${tool}-tool`).classList.add('active');
    });
});

// 颜色识别工具
let currentImage = null;
let currentZoom = 1;
let imageScale = 1;

const imageUpload = document.getElementById('image-upload');
const zoomInBtn = document.getElementById('zoom-in-btn');
const zoomOutBtn = document.getElementById('zoom-out-btn');
const zoomValue = document.getElementById('zoom-value');
const imageCanvas = document.getElementById('image-canvas');
const ctx = imageCanvas.getContext('2d');
const colorPreview = document.getElementById('color-preview');
const selectedColorInfo = document.getElementById('selected-color-info');
const selectedColorBox = document.getElementById('selected-color-box');
const selectedHex = document.getElementById('selected-hex');
const selectedRgb = document.getElementById('selected-rgb');
const matchedColors = document.getElementById('matched-colors');
const matchedColorsList = document.getElementById('matched-colors-list');

const imageWrapper = document.querySelector('.image-wrapper');
const uploadArea = document.getElementById('upload-area');

// 加载图片的通用函数
function loadImageFromFile(file) {
    if (!file || !file.type.startsWith('image/')) {
        alert('请上传有效的图片文件！');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            currentImage = img;
            currentZoom = 1;
            // 计算初始缩放比例，使图片撑满画框
            const wrapper = document.querySelector('.image-wrapper');
            if (wrapper) {
                // 获取容器的实际可用尺寸（减去padding和border）
                const rect = wrapper.getBoundingClientRect();
                const maxWidth = rect.width - 4; // 减去border
                const maxHeight = rect.height - 4; // 减去border
                // 计算缩放比例，使图片撑满容器（取较小的比例以保持比例）
                imageScale = Math.min(maxWidth / img.width, maxHeight / img.height);
            } else {
                imageScale = 1;
            }
            drawImage();
            // 隐藏上传区域，显示canvas
            uploadArea.style.display = 'none';
            imageCanvas.style.display = 'block';
            // 重置颜色选择信息（新图片上传时）
            selectedColorInfo.style.display = 'none';
            matchedColors.style.display = 'none';
        };
        img.onloaderror = () => {
            alert('图片加载失败，请重试！');
        };
        img.src = event.target.result;
    };
    reader.onerror = () => {
        alert('文件读取失败，请重试！');
    };
    reader.readAsDataURL(file);
}

// 文件选择上传
imageUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        loadImageFromFile(file);
    }
});

// 点击上传区域上传
uploadArea.addEventListener('click', () => {
    imageUpload.click();
});

// 拖拽上传
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) {
        loadImageFromFile(file);
    }
});

// 粘贴上传
document.addEventListener('paste', (e) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            loadImageFromFile(file);
            break;
        }
    }
});

// 绘制图片
function drawImage() {
    if (!currentImage) return;
    
    // 计算实际显示尺寸
    const baseWidth = currentImage.width * imageScale;
    const baseHeight = currentImage.height * imageScale;
    const displayWidth = baseWidth * currentZoom;
    const displayHeight = baseHeight * currentZoom;
    
    // 设置canvas的实际像素尺寸（不受CSS影响）
    imageCanvas.width = displayWidth;
    imageCanvas.height = displayHeight;
    
    // 设置canvas的显示尺寸（CSS样式）- 固定尺寸，不随缩放改变容器
    imageCanvas.style.width = displayWidth + 'px';
    imageCanvas.style.height = displayHeight + 'px';
    imageCanvas.style.maxWidth = 'none';
    imageCanvas.style.maxHeight = 'none';
    imageCanvas.style.minWidth = '0';
    imageCanvas.style.minHeight = '0';
    
    // 绘制图片到canvas（使用原始图片尺寸绘制到缩放后的canvas）
    ctx.drawImage(currentImage, 0, 0, displayWidth, displayHeight);
    
    // 注意：不在这里重置颜色选择信息，保持匹配结果可见
    // 只有在重新上传图片时才需要重置
}

// 缩放控制（提高上限到10倍）
zoomInBtn.addEventListener('click', () => {
    if (currentImage) {
        currentZoom = Math.min(currentZoom * 1.2, 10);
        updateZoom();
    }
});

zoomOutBtn.addEventListener('click', () => {
    if (currentImage) {
        currentZoom = Math.max(currentZoom / 1.2, 0.2);
        updateZoom();
    }
});

function updateZoom() {
    if (currentImage) {
        zoomValue.textContent = Math.round(currentZoom * 100) + '%';
        drawImage();
    }
}

// 鼠标滚轮缩放（提高上限到10倍）
imageWrapper.addEventListener('wheel', (e) => {
    if (!currentImage) return;
    
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    currentZoom = Math.max(0.2, Math.min(10, currentZoom * delta));
    updateZoom();
}, { passive: false });

// 双指捏合缩放
let initialDistance = 0;
let initialZoom = 1;

imageWrapper.addEventListener('touchstart', (e) => {
    if (!currentImage || e.touches.length !== 2) return;
    
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    initialDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
    );
    initialZoom = currentZoom;
}, { passive: true });

imageWrapper.addEventListener('touchmove', (e) => {
    if (!currentImage || e.touches.length !== 2) return;
    
    e.preventDefault();
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    const currentDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
    );
    
    if (initialDistance > 0) {
        const scale = currentDistance / initialDistance;
        currentZoom = Math.max(0.2, Math.min(10, initialZoom * scale));
        updateZoom();
    }
}, { passive: false });

imageWrapper.addEventListener('touchend', () => {
    initialDistance = 0;
}, { passive: true });

// 拖动查看功能
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let scrollStartX = 0;
let scrollStartY = 0;
let hasMoved = false; // 标记是否发生了移动

// 鼠标按下事件 - 开始拖动
imageWrapper.addEventListener('mousedown', (e) => {
    if (!currentImage) return;
    // 只在图片区域启用拖动
    if (e.target === imageCanvas || e.target === imageWrapper) {
        isDragging = true;
        hasMoved = false;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        scrollStartX = imageWrapper.scrollLeft;
        scrollStartY = imageWrapper.scrollTop;
        imageWrapper.style.cursor = 'grabbing';
        // 不阻止默认行为，让点击事件也能正常触发
    }
});

// 鼠标移动事件 - 拖动中
imageWrapper.addEventListener('mousemove', (e) => {
    if (!isDragging || !currentImage) return;
    
    const deltaX = dragStartX - e.clientX;
    const deltaY = dragStartY - e.clientY;
    const moveDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // 如果移动距离超过3px，认为是拖动
    if (moveDistance > 3) {
        hasMoved = true;
        imageWrapper.scrollLeft = scrollStartX + deltaX;
        imageWrapper.scrollTop = scrollStartY + deltaY;
        e.preventDefault();
        e.stopPropagation();
    }
});

// 鼠标释放事件 - 结束拖动
imageWrapper.addEventListener('mouseup', (e) => {
    if (isDragging) {
        isDragging = false;
        imageWrapper.style.cursor = 'crosshair';
        // 如果发生了拖动，阻止点击事件
        if (hasMoved) {
            e.preventDefault();
            e.stopPropagation();
        }
    }
});

// 鼠标离开容器时也结束拖动
imageWrapper.addEventListener('mouseleave', () => {
    if (isDragging) {
        isDragging = false;
        hasMoved = false;
        imageWrapper.style.cursor = 'crosshair';
    }
});

// 统一的颜色拾取函数
function pickColorAtPosition(clientX, clientY) {
    if (!currentImage) return;

    const imageWrapper = document.getElementById('image-wrapper');
    const rect = imageCanvas.getBoundingClientRect();

    // 计算相对于canvas的坐标
    // getBoundingClientRect() 已经考虑了页面滚动，但还需要考虑容器的滚动偏移
    const wrapperScrollLeft = imageWrapper.scrollLeft;
    const wrapperScrollTop = imageWrapper.scrollTop;

    // 计算点击点相对于canvas左上角的坐标
    // 减去容器的滚动偏移，确保坐标正确
    const canvasX = clientX - rect.left + wrapperScrollLeft;
    const canvasY = clientY - rect.top + wrapperScrollTop;

    // 获取canvas的实际像素尺寸（已经在drawImage中设置）
    const pixelWidth = imageCanvas.width;
    const pixelHeight = imageCanvas.height;

    // 获取canvas的实际显示尺寸
    // 由于 imageCanvas.style.width/height 被设置为 pixelWidth/Height
    // 理论上 rect.width/height 应该等于 pixelWidth/Height
    // 但可能存在浏览器舍入误差，所以计算比例以确保准确性
    const displayWidth = rect.width || pixelWidth;
    const displayHeight = rect.height || pixelHeight;

    // 计算缩放比例（处理舍入误差）
    const scaleX = pixelWidth / displayWidth;
    const scaleY = pixelHeight / displayHeight;

    // 计算实际canvas像素坐标
    // 使用精确的计算，避免累积误差
    const x = Math.round(canvasX * scaleX);
    const y = Math.round(canvasY * scaleY);

    // 确保坐标在画布范围内
    const clampedX = Math.max(0, Math.min(x, pixelWidth - 1));
    const clampedY = Math.max(0, Math.min(y, pixelHeight - 1));
    
    // 获取像素颜色
    const imageData = ctx.getImageData(clampedX, clampedY, 1, 1);
    const r = imageData.data[0];
    const g = imageData.data[1];
    const b = imageData.data[2];
    
    // 显示颜色预览（保留+号）
    const color = `rgb(${r}, ${g}, ${b})`;
    colorPreview.style.backgroundColor = color;

    // 计算相对于 image-wrapper 的坐标（考虑容器滚动）
    const imageWrapper = document.getElementById('image-wrapper');
    const wrapperRect = imageWrapper.getBoundingClientRect();

    // 计算点击点相对于 image-wrapper 的坐标
    const relativeX = clientX - wrapperRect.left;
    const relativeY = clientY - wrapperRect.top;

    colorPreview.style.left = relativeX + 'px';
    colorPreview.style.top = relativeY + 'px';
    colorPreview.style.display = 'flex';
    
    // 显示选中的颜色信息
    selectedColorBox.style.backgroundColor = color;
    selectedHex.textContent = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
    selectedRgb.textContent = `(${r}, ${g}, ${b})`;
    selectedColorInfo.style.display = 'block';
    
    // 查找匹配的颜色
    const targetRgb = { r, g, b };
    const closestColors = findClosestColors(targetRgb);
    
    // 显示匹配结果
    renderMatchedColorsList(closestColors, matchedColorsList);
    
    matchedColors.style.display = 'block';
}

// 图片点击事件 - 颜色识别（只在非拖动时触发）
imageCanvas.addEventListener('click', (e) => {
    // 如果刚刚发生了拖动，不触发颜色识别
    if (hasMoved) {
        hasMoved = false;
        return;
    }
    
    pickColorAtPosition(e.clientX, e.clientY);
});

// 移动端触摸事件 - 颜色识别
let touchStartTime = 0;
let touchStartX = 0;
let touchStartY = 0;
let touchHasMoved = false;

imageCanvas.addEventListener('touchstart', (e) => {
    if (!currentImage) return;
    
    // 如果是双指触摸，不处理（用于缩放）
    if (e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    touchStartTime = Date.now();
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchHasMoved = false;
}, { passive: true });

imageCanvas.addEventListener('touchmove', (e) => {
    if (!currentImage || e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartX);
    const deltaY = Math.abs(touch.clientY - touchStartY);
    
    // 如果移动距离超过5px，认为是拖动
    if (deltaX > 5 || deltaY > 5) {
        touchHasMoved = true;
    }
}, { passive: true });

imageCanvas.addEventListener('touchend', (e) => {
    if (!currentImage) return;

    // 如果是双指触摸结束，不处理
    if (e.touches.length > 0) return;

    // 如果发生了拖动，不触发颜色识别
    if (touchHasMoved) {
        touchHasMoved = false;
        return;
    }

    // 使用触摸结束时的准确坐标
    const touch = e.changedTouches[0];
    const touchDuration = Date.now() - touchStartTime;

    // 只有快速点击（小于300ms）才触发颜色识别
    if (touchDuration < 300) {
        e.preventDefault();
        // 使用 touch.clientX/clientY，这是触摸结束时的准确位置
        pickColorAtPosition(touch.clientX, touch.clientY);
    }

    touchHasMoved = false;
}, { passive: false });

// 色卡工具
const colorChartGrid = document.getElementById('color-chart-grid');
let currentFilter = 'all';

// 渲染色卡
function renderColorChart() {
    colorChartGrid.innerHTML = '';
    
    // 如果当前色号系统不是MARD，按新系统分组显示
    if (currentColorSystem !== 'MARD') {
        const allColors = getAllColors();
        const groups = {};
        
        // 按新系统分组
        allColors.forEach(color => {
            const displayId = getDisplayId(color, currentColorSystem);
            // 如果返回 null（即 "-"），不显示该颜色
            if (displayId === null) {
                return;
            }
            
            const newGroup = getGroupBySystem(color, currentColorSystem);
            if (!newGroup) {
                return;
            }
            
            if (!groups[newGroup]) {
                groups[newGroup] = [];
            }
            
            groups[newGroup].push({
                ...color,
                displayId: displayId
            });
        });
        
        // 排序分组
        const sortedGroups = Object.keys(groups).sort((a, b) => {
            // 数字组放在最后，并按范围排序
            if (a.startsWith('数字') && b.startsWith('数字')) {
                const aNum = parseInt(a.match(/\d+/)[0]);
                const bNum = parseInt(b.match(/\d+/)[0]);
                return aNum - bNum;
            }
            if (a.startsWith('数字')) return 1;
            if (b.startsWith('数字')) return -1;
            return a.localeCompare(b);
        });
        
        sortedGroups.forEach(group => {
            const groupHeader = document.createElement('div');
            groupHeader.className = 'group-header collapsed';
            groupHeader.dataset.group = group;
            const groupName = group.startsWith('数字') ? group : `${group} 组`;
            const toggle = document.createElement('span');
            toggle.className = 'group-toggle';
            toggle.textContent = '▶';
            groupHeader.innerHTML = `<span>${groupName} (${groups[group].length} 色)</span>`;
            groupHeader.appendChild(toggle);
            
            // 折叠功能 - 整个标题栏可点击
            groupHeader.addEventListener('click', () => {
                const content = groupHeader.nextElementSibling;
                if (content && content.classList.contains('group-content')) {
                    groupHeader.classList.toggle('collapsed');
                    content.classList.toggle('collapsed');
                    toggle.textContent = groupHeader.classList.contains('collapsed') ? '▶' : '▼';
                }
            });
            
            colorChartGrid.appendChild(groupHeader);
            
            const groupContent = document.createElement('div');
            groupContent.className = 'group-content collapsed';
            
            groups[group].forEach(colorInfo => {
                const card = document.createElement('div');
                card.className = 'color-card';
                card.style.cursor = 'pointer';
                
                card.addEventListener('click', () => {
                    showColorDetail(colorInfo);
                });
                
                const header = document.createElement('div');
                header.className = 'color-card-header';
                
                const swatch = document.createElement('div');
                swatch.className = 'color-card-swatch';
                swatch.style.backgroundColor = colorInfo.hex;
                
                const idContainer = document.createElement('div');
                const id = document.createElement('div');
                id.className = 'color-card-id';
                // 显示新系统的色号，如果包含 "/" 则显示两个色号
                // 格式化显示ID（处理"/"的情况）
                let displayText = colorInfo.displayId;
                if (displayText && displayText.includes('/')) {
                    displayText = displayText.replace('/', ' / ');
                }
                id.textContent = displayText || colorInfo.id;
                
                if (colorInfo.name) {
                    const name = document.createElement('div');
                    name.className = 'color-card-name';
                    name.textContent = colorInfo.name;
                    idContainer.appendChild(id);
                    idContainer.appendChild(name);
                } else {
                    idContainer.appendChild(id);
                }
                
                header.appendChild(swatch);
                header.appendChild(idContainer);
                
                card.appendChild(header);
                groupContent.appendChild(card);
            });
            
            colorChartGrid.appendChild(groupContent);
        });
    } else {
        // MARD系统，按原方式显示
        const groups = Object.keys(mard221Colors);
        
        groups.forEach(group => {
            const groupHeader = document.createElement('div');
            groupHeader.className = 'group-header collapsed';
            groupHeader.dataset.group = group;
            const toggle = document.createElement('span');
            toggle.className = 'group-toggle';
            toggle.textContent = '▶';
            groupHeader.innerHTML = `<span>${group} 组 (${mard221Colors[group].length} 色)</span>`;
            groupHeader.appendChild(toggle);
            
            // 折叠功能 - 整个标题栏可点击
            groupHeader.addEventListener('click', () => {
                const content = groupHeader.nextElementSibling;
                if (content && content.classList.contains('group-content')) {
                    groupHeader.classList.toggle('collapsed');
                    content.classList.toggle('collapsed');
                    toggle.textContent = groupHeader.classList.contains('collapsed') ? '▶' : '▼';
                }
            });
            
            colorChartGrid.appendChild(groupHeader);
            
            const groupContent = document.createElement('div');
            groupContent.className = 'group-content collapsed';
            
            mard221Colors[group].forEach(color => {
                const card = document.createElement('div');
                card.className = 'color-card';
                card.style.cursor = 'pointer';
                
                card.addEventListener('click', () => {
                    showColorDetail(color);
                });
                
                const header = document.createElement('div');
                header.className = 'color-card-header';
                
                const swatch = document.createElement('div');
                swatch.className = 'color-card-swatch';
                swatch.style.backgroundColor = color.hex;
                
                const idContainer = document.createElement('div');
                const id = document.createElement('div');
                id.className = 'color-card-id';
                id.textContent = color.id;
                
                if (color.name) {
                    const name = document.createElement('div');
                    name.className = 'color-card-name';
                    name.textContent = color.name;
                    idContainer.appendChild(id);
                    idContainer.appendChild(name);
                } else {
                    idContainer.appendChild(id);
                }
                
                header.appendChild(swatch);
                header.appendChild(idContainer);
                
                card.appendChild(header);
                groupContent.appendChild(card);
            });
            
            colorChartGrid.appendChild(groupContent);
        });
    }
}

// 显示颜色详情
const colorDetailModal = document.getElementById('color-detail-modal');
const detailColorId = document.getElementById('detail-color-id');
const detailColorBox = document.getElementById('detail-color-box');
const detailHex = document.getElementById('detail-hex');
const detailRgb = document.getElementById('detail-rgb');
const alternativeColorsList = document.getElementById('alternative-colors-list');
const closeDetailBtn = document.getElementById('close-detail-btn');

function showColorDetail(color) {
    // 显示选中的颜色信息
    detailColorId.textContent = formatDisplayId(color);
    detailColorBox.style.backgroundColor = color.hex;
    detailHex.textContent = color.hex;
    detailRgb.textContent = `(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`;
    
    // 查找10个替代颜色（排除自己，只考虑用户已选择的颜色）
    const allColors = getAllColors();
    let filteredColors = filterSelectedColors(allColors, color.id);
    
    // 如果过滤后没有颜色，返回所有颜色（排除自己）
    if (filteredColors.length === 0) {
        filteredColors = allColors.filter(c => c.id !== color.id);
    }
    
    const colorsWithDistance = filteredColors.map(c => ({
        ...c,
        distance: colorDistance(color.rgb, c.rgb),
        similarity: colorSimilarity(color.rgb, c.rgb)
    }));
    
    colorsWithDistance.sort((a, b) => a.distance - b.distance);
    const alternatives = colorsWithDistance.slice(0, 10);
    
    // 显示替代颜色
    alternativeColorsList.innerHTML = '';
    alternatives.forEach(altColor => {
        const item = document.createElement('div');
        item.className = 'alternative-color-item';
        
        const colorBox = document.createElement('div');
        colorBox.className = 'alternative-color-box';
        colorBox.style.backgroundColor = altColor.hex;
        
        const info = document.createElement('div');
        info.className = 'alternative-color-info';
        
        const id = document.createElement('div');
        id.className = 'alternative-color-id';
        id.textContent = formatDisplayId(altColor);
        
        const values = document.createElement('div');
        values.className = 'alternative-color-values';
        values.innerHTML = `
            HEX: <span>${altColor.hex}</span> | 
            RGB: <span>(${altColor.rgb.r}, ${altColor.rgb.g}, ${altColor.rgb.b})</span>
        `;
        
        const similarity = document.createElement('div');
        similarity.className = 'similarity-badge';
        similarity.textContent = `相似度: ${altColor.similarity}%`;
        
        info.appendChild(id);
        info.appendChild(values);
        info.appendChild(similarity);
        
        item.appendChild(colorBox);
        item.appendChild(info);
        
        alternativeColorsList.appendChild(item);
    });
    
    // 显示模态框
    colorDetailModal.style.display = 'flex';
    
    // 桌面端：将模态框定位到页面中央（考虑滚动位置）
    if (window.innerWidth >= 769) {
        setTimeout(() => {
            const modalContent = colorDetailModal.querySelector('.modal-content');
            if (modalContent) {
                const pageHeight = Math.max(
                    document.body.scrollHeight,
                    document.documentElement.scrollHeight
                );
                const viewportHeight = window.innerHeight;
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const modalHeight = modalContent.offsetHeight;
                
                // 计算页面中心位置
                const pageCenter = pageHeight / 2;
                const targetTop = pageCenter - (modalHeight / 2);
                
                // 确保模态框在可见区域内
                const minTop = scrollTop + 40;
                const maxTop = scrollTop + viewportHeight - modalHeight - 40;
                let finalTop = Math.max(minTop, Math.min(maxTop, targetTop));
                
                // 如果页面中心在可见区域内，使用页面中心；否则使用视口中心
                if (targetTop >= minTop && targetTop <= maxTop) {
                    finalTop = targetTop;
                } else {
                    finalTop = scrollTop + (viewportHeight / 2) - (modalHeight / 2);
                }
                
                modalContent.style.top = finalTop + 'px';
                modalContent.style.position = 'absolute';
                modalContent.style.left = '50%';
                modalContent.style.transform = 'translateX(-50%)';
                modalContent.style.margin = '0';
                
                // 滚动到模态框位置
                const scrollTo = finalTop - (viewportHeight / 2) + (modalHeight / 2);
                window.scrollTo({
                    top: Math.max(0, scrollTo),
                    behavior: 'smooth'
                });
            }
        }, 50);
    } else {
        // 移动端：重置样式，确保居中显示
        setTimeout(() => {
            const modalContent = colorDetailModal.querySelector('.modal-content');
            if (modalContent) {
                // 清除桌面端可能设置的样式
                modalContent.style.position = '';
                modalContent.style.top = '';
                modalContent.style.left = '';
                modalContent.style.transform = '';
                modalContent.style.margin = '';
            }
        }, 10);
    }
}

// 关闭模态框
closeDetailBtn.addEventListener('click', () => {
    colorDetailModal.style.display = 'none';
});

// 点击模态框背景关闭
colorDetailModal.addEventListener('click', (e) => {
    if (e.target === colorDetailModal) {
        colorDetailModal.style.display = 'none';
    }
});

// ESC键关闭模态框
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && colorDetailModal.style.display === 'flex') {
        colorDetailModal.style.display = 'none';
    }
});

// 初始化色卡
renderColorChart();

// 深色模式切换
const themeToggle = document.getElementById('theme-toggle');
let isDarkMode = localStorage.getItem('darkMode') === 'true';

function applyTheme() {
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        themeToggle.textContent = '☀️';
    } else {
        document.body.classList.remove('dark-mode');
        themeToggle.textContent = '🌙';
    }
}

applyTheme();

themeToggle.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    localStorage.setItem('darkMode', isDarkMode);
    applyTheme();
});

// 色号系统选择器
const colorSystemSelect = document.getElementById('color-system-select');
colorSystemSelect.value = currentColorSystem;
colorSystemSelect.addEventListener('change', (e) => {
    currentColorSystem = e.target.value;
    localStorage.setItem('colorSystem', currentColorSystem);
    // 重新渲染色卡和匹配结果
    renderColorChart();
    // 如果颜色管理界面打开，重新渲染
    if (colorManagerModal.style.display === 'flex') {
        renderColorManager();
    }
    // 如果当前有匹配结果，重新显示
    if (matchedColors.style.display === 'block') {
        const rgbText = selectedRgb.textContent;
        const rgbMatch = rgbText.match(/\d+/g);
        if (rgbMatch && rgbMatch.length >= 3) {
            const rgb = {
                r: parseInt(rgbMatch[0]),
                g: parseInt(rgbMatch[1]),
                b: parseInt(rgbMatch[2])
            };
            const closestColors = findClosestColors(rgb);
            renderMatchedColorsList(closestColors, matchedColorsList);
        }
    }
});

    // 颜色管理界面
    const colorManagerBtn = document.getElementById('color-manager-btn');
    const colorManagerModal = document.getElementById('color-manager-modal');
    const closeColorManagerBtn = document.getElementById('close-color-manager-btn');
    const colorManagerGrid = document.getElementById('color-manager-grid');
    const selectAllBtn = document.getElementById('select-all-btn');
    const deselectAllBtn = document.getElementById('deselect-all-btn');
    const saveBtn = document.getElementById('save-btn');
    const exportBtn = document.getElementById('export-btn');
    const importFile = document.getElementById('import-file');
    const selectedCountSpan = document.getElementById('selected-count');
    const totalCountSpan = document.getElementById('total-count');

    // 检查元素是否存在
    if (!selectAllBtn || !deselectAllBtn) {
        console.error('全选/全不选按钮未找到！');
        return;
    }

    // 打开颜色管理界面
    if (colorManagerBtn) {
        colorManagerBtn.addEventListener('click', () => {
            renderColorManager();
            colorManagerModal.style.display = 'flex';
        });
    }

    // 关闭颜色管理界面
    if (closeColorManagerBtn) {
        closeColorManagerBtn.addEventListener('click', () => {
            colorManagerModal.style.display = 'none';
        });
    }

    if (colorManagerModal) {
        colorManagerModal.addEventListener('click', (e) => {
            // 只在点击模态框背景时关闭，不阻止其他点击事件
            if (e.target === colorManagerModal) {
                colorManagerModal.style.display = 'none';
            }
        });
    }

    // 渲染颜色管理界面
    function renderColorManager(preserveState = true) {
    // 保存当前展开的分组状态
    const expandedGroups = new Set();
    if (preserveState) {
        const groupHeaders = colorManagerGrid.querySelectorAll('.color-manager-group-header');
        groupHeaders.forEach(header => {
            if (!header.classList.contains('collapsed')) {
                const group = header.dataset.group;
                if (group) {
                    expandedGroups.add(group);
                }
            }
        });
    }
    
    const allColors = getAllColors();
    const selectedIds = getSelectedColorIds();
    
    // 根据当前色号系统过滤和分组
    const filteredColors = [];
    const groups = {};
    
    allColors.forEach(color => {
        const displayId = getDisplayId(color, currentColorSystem);
        // 如果返回 null（即 "-"），不显示该颜色
        if (displayId === null) {
            return;
        }
        
        // 获取新系统的分组
        const newGroup = getGroupBySystem(color, currentColorSystem);
        if (!newGroup) {
            return; // 如果没有分组，跳过
        }
        
        if (!groups[newGroup]) {
            groups[newGroup] = [];
        }
        
        // 存储颜色信息，包括显示ID
        const colorInfo = {
            ...color,
            displayId: displayId,
            newGroup: newGroup
        };
        
        groups[newGroup].push(colorInfo);
        filteredColors.push(colorInfo);
    });
    
    totalCountSpan.textContent = filteredColors.length;
    
    // 暂时禁用过渡动画以避免抖动
    if (preserveState) {
        colorManagerGrid.style.transition = 'none';
    }
    
    colorManagerGrid.innerHTML = '';
    
    // 排序分组：字母组按字母顺序，数字组放在最后并按范围排序
    const sortedGroups = Object.keys(groups).sort((a, b) => {
        // 数字组放在最后
        const aIsNum = a.startsWith('数字');
        const bIsNum = b.startsWith('数字');
        if (aIsNum && !bIsNum) return 1;
        if (!aIsNum && bIsNum) return -1;
        // 如果都是数字组，按范围排序
        if (aIsNum && bIsNum) {
            const aNum = parseInt(a.match(/\d+/)?.[0] || '0');
            const bNum = parseInt(b.match(/\d+/)?.[0] || '0');
            return aNum - bNum;
        }
        // 字母组按字母顺序
        return a.localeCompare(b);
    });
    
    sortedGroups.forEach(group => {
        const groupHeader = document.createElement('div');
        // 如果这个分组之前是展开的，保持展开状态
        const isExpanded = expandedGroups.has(group);
        groupHeader.className = isExpanded ? 'color-manager-group-header' : 'color-manager-group-header collapsed';
        groupHeader.dataset.group = group;
        
        // 如果正在保持状态，暂时禁用过渡动画
        if (preserveState) {
            groupHeader.style.transition = 'none';
        }
        
        const leftSection = document.createElement('div');
        leftSection.className = 'group-header-left';
        
        const toggle = document.createElement('span');
        toggle.className = 'color-manager-group-toggle';
        toggle.textContent = isExpanded ? '▼' : '▶';
        
        const groupTitle = document.createElement('span');
        const groupName = group.startsWith('数字') ? group : `${group} 组`;
        groupTitle.textContent = `${groupName} (${groups[group].length} 色)`;
        
        leftSection.appendChild(toggle);
        leftSection.appendChild(groupTitle);
        
        // 折叠功能 - 只有左侧标题区域可点击
        leftSection.addEventListener('click', function(e) {
            // 如果点击的元素包含 no-collapse-trigger 类，跳过折叠
            if (e.target.classList.contains('no-collapse-trigger') || e.target.closest('.no-collapse-trigger')) {
                return;
            }

            const content = groupHeader.nextElementSibling;
            if (content && content.classList.contains('color-manager-group-content')) {
                groupHeader.classList.toggle('collapsed');
                content.classList.toggle('collapsed');
                toggle.textContent = groupHeader.classList.contains('collapsed') ? '▶' : '▼';
                // 强制触发重绘
                content.style.display = 'none';
                content.offsetHeight; // 强制重绘
                content.style.display = '';
            }
        }); // 使用默认冒泡阶段
        
        const groupButtons = document.createElement('div');
        groupButtons.className = 'group-buttons';
        
        const groupSelectBtn = document.createElement('button');
        groupSelectBtn.className = 'btn-group-select no-collapse-trigger';
        groupSelectBtn.textContent = '全选此组';
        groupSelectBtn.dataset.group = group;
        groupSelectBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            selectGroupByNewSystem(group, groups[group]);
        }, true); // 使用捕获阶段

        const groupDeselectBtn = document.createElement('button');
        groupDeselectBtn.className = 'btn-group-deselect no-collapse-trigger';
        groupDeselectBtn.textContent = '全不选此组';
        groupDeselectBtn.dataset.group = group;
        groupDeselectBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            deselectGroupByNewSystem(group, groups[group]);
        }, true); // 使用捕获阶段
        
        groupButtons.appendChild(groupSelectBtn);
        groupButtons.appendChild(groupDeselectBtn);
        
        groupHeader.appendChild(leftSection);
        groupHeader.appendChild(groupButtons);
        colorManagerGrid.appendChild(groupHeader);
        
        const groupContent = document.createElement('div');
        // 如果这个分组之前是展开的，保持展开状态
        groupContent.className = isExpanded ? 'color-manager-group-content' : 'color-manager-group-content collapsed';
        
        // 如果正在保持状态，暂时禁用过渡动画
        if (preserveState) {
            groupContent.style.transition = 'none';
        }
        
        groups[group].forEach(colorInfo => {
            const card = document.createElement('div');
            card.className = 'color-manager-card';
            card.dataset.colorId = colorInfo.id;
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `color-${colorInfo.id}`;
            checkbox.checked = selectedIds.has(colorInfo.id);
            checkbox.addEventListener('change', (e) => {
                updateSelectedColors(colorInfo.id, e.target.checked);
            });
            
            const label = document.createElement('label');
            label.htmlFor = `color-${colorInfo.id}`;
            label.className = 'color-manager-label';
            
            const swatch = document.createElement('div');
            swatch.className = 'color-manager-swatch';
            swatch.style.backgroundColor = colorInfo.hex;
            
            const idText = document.createElement('div');
            idText.className = 'color-manager-id';
            // 显示新系统的色号，如果包含 "/" 则显示两个色号
            // 格式化显示ID（处理"/"的情况）
            let displayText = colorInfo.displayId;
            if (displayText && displayText.includes('/')) {
                displayText = displayText.replace('/', ' / ');
            }
            idText.textContent = displayText || colorInfo.id;
            
            label.appendChild(swatch);
            label.appendChild(idText);
            
            card.appendChild(checkbox);
            card.appendChild(label);
            
            groupContent.appendChild(card);
        });
        
        colorManagerGrid.appendChild(groupContent);
    });
    
    updateSelectedCount();
    
    // 恢复过渡动画
    if (preserveState) {
        // 使用 requestAnimationFrame 确保在下一帧恢复过渡
        requestAnimationFrame(() => {
            colorManagerGrid.style.transition = '';
            // 恢复所有分组标题和内容的过渡
            const allHeaders = colorManagerGrid.querySelectorAll('.color-manager-group-header');
            const allContents = colorManagerGrid.querySelectorAll('.color-manager-group-content');
            allHeaders.forEach(header => {
                header.style.transition = '';
            });
            allContents.forEach(content => {
                content.style.transition = '';
            });
        });
    }
}

    // 更新已选择数量
    function updateSelectedCount() {
        const selectedIds = getSelectedColorIds();
        if (selectedCountSpan) {
            selectedCountSpan.textContent = selectedIds.size;
        }
    }

    // 全选
    if (selectAllBtn) {
        selectAllBtn.onclick = function(e) {
            console.log('全选按钮被点击');
            e.preventDefault();
            e.stopPropagation();

            const allColors = getAllColors();
            // 只选择当前色号系统下有效的颜色
            const validColors = allColors.filter(color => {
                const displayId = getDisplayId(color, currentColorSystem);
                return displayId !== null;
            });
            const selectedIds = new Set(validColors.map(c => c.id));
            saveSelectedColorIds(selectedIds);
            renderColorManager();

            return false;
        };
    }

    // 全不选
    if (deselectAllBtn) {
        deselectAllBtn.onclick = function(e) {
            console.log('全不选按钮被点击');
            e.preventDefault();
            e.stopPropagation();

            saveSelectedColorIds(new Set());
            renderColorManager();

            return false;
        };
    }

    // 按组全选（使用新系统分组）
    function selectGroupByNewSystem(group, groupColors) {
        const selectedIds = getSelectedColorIds();
        groupColors.forEach(colorInfo => {
            selectedIds.add(colorInfo.id);
        });
        saveSelectedColorIds(selectedIds);
        renderColorManager();
    }

    // 按组全不选（使用新系统分组）
    function deselectGroupByNewSystem(group, groupColors) {
        const selectedIds = getSelectedColorIds();
        groupColors.forEach(colorInfo => {
            selectedIds.delete(colorInfo.id);
        });
        saveSelectedColorIds(selectedIds);
        renderColorManager();
    }

    // 更新已选择的颜色
    function updateSelectedColors(colorId, isSelected) {
        const selectedIds = getSelectedColorIds();
        if (isSelected) {
            selectedIds.add(colorId);
        } else {
            selectedIds.delete(colorId);
        }
        saveSelectedColorIds(selectedIds);
        updateSelectedCount();
    }

    // 保存按钮
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const selectedIds = getSelectedColorIds();
            saveSelectedColorIds(selectedIds);
            
            // 显示保存成功提示
            const originalText = saveBtn.textContent;
            saveBtn.textContent = '✓ 已保存';
            saveBtn.style.background = '#28a745';
            setTimeout(() => {
                saveBtn.textContent = originalText;
                saveBtn.style.background = '';
            }, 2000);
        });
    }

    // 导出配置
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const selectedIds = getSelectedColorIds();
            const config = {
                version: '1.0',
                colorSystem: currentColorSystem,
                selectedColors: Array.from(selectedIds),
                exportDate: new Date().toISOString()
            };
            
            const dataStr = JSON.stringify(config, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `color-config-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        });
    }

    // 导入配置
    if (importFile) {
        importFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const config = JSON.parse(event.target.result);
                    
                    if (config.selectedColors && Array.isArray(config.selectedColors)) {
                        // 验证颜色ID是否有效
                        const allColors = getAllColors();
                        const allColorIds = new Set(allColors.map(c => c.id));
                        const validColors = config.selectedColors.filter(id => allColorIds.has(id));
                        
                        if (validColors.length === 0) {
                            alert('导入的配置中没有有效的颜色ID！');
                            return;
                        }
                        
                        // 询问用户是否要导入
                        const confirmMsg = `找到 ${validColors.length} 个有效颜色，是否导入？\n` +
                            (config.selectedColors.length !== validColors.length 
                                ? `（${config.selectedColors.length - validColors.length} 个无效颜色将被忽略）\n` 
                                : '') +
                            (config.colorSystem ? `色号系统: ${config.colorSystem}\n` : '');
                        
                        if (confirm(confirmMsg)) {
                            const selectedIds = new Set(validColors);
                            saveSelectedColorIds(selectedIds);
                            
                            // 如果配置中有色号系统，询问是否切换
                            if (config.colorSystem && config.colorSystem !== currentColorSystem) {
                                if (confirm(`配置中使用的色号系统是 "${config.colorSystem}"，是否切换？`)) {
                                    currentColorSystem = config.colorSystem;
                                    localStorage.setItem('colorSystem', currentColorSystem);
                                    const colorSystemSelect = document.getElementById('color-system-select');
                                    if (colorSystemSelect) {
                                        colorSystemSelect.value = currentColorSystem;
                                    }
                                }
                            }
                            
                            renderColorManager();
                            alert('导入成功！');
                        }
                    } else {
                        alert('配置文件格式不正确！');
                    }
                } catch (error) {
                    console.error('导入错误:', error);
                    alert('导入失败：' + error.message);
                }
                
                // 清空文件选择，以便可以重复导入同一文件
                e.target.value = '';
            };
            reader.onerror = () => {
                alert('文件读取失败！');
            };
            reader.readAsText(file);
        });
    }

    console.log('初始化完成！');
    } // 结束 init 函数
    
    // 立即尝试初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(); // 立即执行函数

