 var geoc = new BMapGL.Geocoder();
 const ak = 'QbBwfE7AiCznXAHoIHEVwYZOnY1RLLvz';//QbBwfE7AiCznXAHoIHEVwYZOnY1RLLvz
let vm = new Vue({
    el: "#content",
    data: {
        map: null,
        form: {
            startLngLat: '',    // 起点坐标
            endLngLat: '',        // 终点坐标
            keyword: '',         // 搜索字段
            area: '',
        },
        roadLine: '',           // 路线
        markers: [],                                // 标记点数组
        polylines: [],                              // 线段数组
        isRoadOkey: true,                          // 记录地图上的路段是否已生成完毕
        curSelectMarker: null,                    // 记录要删除的标记
        startIcon: null,                        // 起点图标
        endIcon: null,                          // 终点图标
        middleIcon: null,                          // 途径点图标
        isFull: false,              // 是否全屏
        fullText: '放大',

        markIcon: null, // 标记图标
    },
    created() {
        // 初始化坐标及路线，可以在此处进行初始化赋值，例如坐标点输入回显
        this.form.startLngLat = '';
        this.form.endLngLat = '';
        this.roadLine = '';
        // 设置点击地图时生成的图标
        this.startIcon = new BMapGL.Icon("./images/start-point.png", new BMapGL.Size(25, 29), { anchor: new BMapGL.Size(12, 28) });
        this.endIcon = new BMapGL.Icon("./images/end-point.png", new BMapGL.Size(25, 29), { anchor: new BMapGL.Size(12, 28) });
        this.middleIcon = new BMapGL.Icon("./images/middle-point.png", new BMapGL.Size(25, 29), { anchor: new BMapGL.Size(12, 28) });
        this.markIcon = new BMapGL.Icon("./images/mark.png", new BMapGL.Size(25, 25), { anchor: new BMapGL.Size(12, 28) });
    },
    mounted() {
        this.$nextTick(() => {
            // 初始化地图配置
            this.map = new BMapGL.Map('allmap', {
                minZoom: 5,
                maxZoom: 19
            });
            this.getCurrLocation();
            //启用滚轮放大缩小，默认禁用
            this.map.enableScrollWheelZoom();
            //启用地图惯性拖拽，默认禁用
            this.map.enableContinuousZoom();
            this.map.addEventListener('click', (e, obj) => {
                if (e.overlay) return;
                // 如果正在生成路线，则中断点击事件（否则会出现不可预见的bug，例如路线错乱等）
                if (!this.isRoadOkey) {
                    this.$message({
                        type: 'error',
                        message: '生成路线中，请等待！'
                    });
                    return;
                }
                // 点击以后新增标记点
                this.markers.push(this.getNewMarker(e.latlng.lng, e.latlng.lat));
                this.map.addOverlay(this.markers[this.markers.length - 1]);
                // 如果当前是第一个坐标点，则使用起始点图标，并为起始点坐标赋值
                if (this.markers.length === 1) {
                    this.form.startLngLat = e.latlng.lng + "," + e.latlng.lat;
                    this.markers[0].setIcon(this.startIcon);
                } else {
                    // 否则则设置为终点坐标
                    this.markers[this.markers.length - 1].setIcon(this.endIcon);
                    // 判断上一个坐标是否需要变为途径点坐标
                    this.markers[this.markers.length - 2].setIcon(this.markers.length === 2 ? this.startIcon : this.middleIcon);
                    this.form.endLngLat = e.latlng.lng + "," + e.latlng.lat;
                    // 开始绘制路线
                    this.isRoadOkey = false;
                    this.searchRoad();
                }
            });
            this.loadMap();
        });
    },
    methods: {
        // 获取当前经纬度
        getPosition () {
            return new Promise((resolve, reject) => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(function (position) {
                  let latitude = position.coords.latitude
                  let longitude = position.coords.longitude
                  let data = {
                    latitude: latitude,
                    longitude: longitude
                  }
                  resolve(data)
                }, function () {
                  reject(arguments)
                })
              } else {
                reject('你的浏览器不支持当前地理位置信息获取')
              }
            })
        },
        // 根据当前经纬度设置地图起始位置、添加点标记、设置默认搜索地区
        getCurrLocation() {
            this.getPosition().then(result => {
                // 返回结果示例：
                // {latitude: 30.318030999999998, longitude: 120.05561639999999}
                // 一般小数点后只取六位，所以用以下代码搞定
                let queryData = {
                  longtitude: String(result.longitude).match(/\d+\.\d{0,6}/)[0],
                  latitude: String(result.latitude).match(/\d+\.\d{0,6}/)[0],
                  channelType: '00'
                }
                this.map.centerAndZoom(new BMapGL.Point(queryData.longtitude, queryData.latitude), 15);
                this.getLocationInfoByCoor(queryData.longtitude, queryData.latitude);
              }).catch(err => {
                console.log(err)
              });
        },
        // 创建标记点
        createMark(lng, lat, name) {
            const point = new BMapGL.Point(lng, lat);
            const marker = new BMapGL.Marker(point, { enableDragging: false });
            const label = new BMapGL.Label(this.makeBubl(name), { // 创建文本标注
                position: point, // 设置标注的地理位置
                //offset: new BMapGL.Size(-50, -60) // 设置标注的偏移量
            });
            label.setStyle({ // 设置label的样式
                background: 'unset',
                border: 'unset'
            });
            this.map.addOverlay(label);
            // 添加点击事件，点击坐标点时，获取选中点
            marker.addEventListener("click", (e) => {
                
            });
            this.resultMarkList.push({
                mark: marker,
                label
            });
            return marker;
        },
        // 创建标注
        makeBubl(str) {
            let html = "";
            html +=
                '<div style="width:150px;text-align:center;padding:0px 4px;white-space: pre-wrap;position:relative;background-color:#171e39;color:#fff;transform: translate(-50%,calc(-100% - 29px))">' +
                str +
                '</div>';
            return html;
        },
        // 更新按钮点击事件，将输入框的值回显到地图
        onUpdateClick() {
            // 赋值起始点及结束点
            let start = this.form.startLngLat ? this.getPointLngLat(this.form.startLngLat) : null;
            let end = this.form.endLngLat ? this.getPointLngLat(this.form.endLngLat) : null;
            // 如果没有值，则退出函数
            if (!start && !end) return;
            // 否则清空标点数组及坐标点
            this.markers = [];
            this.map.clearOverlays();
            this.polylines = [];
            this.roadLine = "";
            // 如果起始点存在，则绘制起始点
            if (start) {
                this.markers.push(this.getNewMarker(start.lng, start.lat));
                this.markers[0].setIcon(this.startIcon);
                this.map.addOverlay(this.markers[0]);
            }
            // 如果终点存在，则判断起点是否存在来绘制点
            if (end) {
                this.markers.push(this.getNewMarker(end.lng, end.lat));
                if (this.markers.length === 2) {
                    this.markers[1].setIcon(this.endIcon);
                    this.map.addOverlay(this.markers[1]);
                    this.isRoadOkey = false;
                    this.searchRoad(true);
                } else {
                    this.markers[0].setIcon(this.startIcon);
                    this.map.addOverlay(this.markers[0]);
                }
            }
            
        },
        // 获得点坐标，用以判断输入的坐标点是否为合法坐标点
        getPointLngLat(lnglat) {
            let point = lnglat.split(",");
            if (point.length !== 2) {
                this.$message({
                    type: 'error',
                    message: '写入的点坐标不正确'
                });
                return;
            }
            let lng = Number(point[0]);
            let lat = Number(point[1]);
            if (isNaN(lng) || isNaN(lat)) {
                this.$message({
                    type: 'error',
                    message: '写入的点坐标不正确'
                });
                return;
            }
            return { lng, lat };
        },
        // 加载地图
        loadMap: function () {
            let startLng = '';
            let startLat = '';
            let endLng = '';
            let endLat = '';

            // 回显原有坐标点及路线
            if (this.form.startLngLat) {
                let start = this.form.startLngLat.split(",");
                startLng = start && start.length === 2 ? start[0] : '';
                startLat = start && start.length === 2 ? start[1] : '';
                this.markers.push(this.getNewMarker(startLng, startLat));
                this.markers[0].setIcon(this.startIcon);
                this.map.addOverlay(this.markers[0]);
            }
            if (this.form.endLngLat) {
                let end = this.form.endLngLat.split(",");
                endLng = end && end.length === 2 ? end[0] : '';
                endLat = end && end.length === 2 ? end[1] : '';
                this.markers.push(this.getNewMarker(endLng, endLat));
                this.map.addOverlay(this.markers[this.markers.length - 1]);
                this.markers[this.markers.length - 1].setIcon(this.markers.length - 1 === 0 ? this.startIcon : this.endIcon);
            }
            if (this.roadLine) {
                this.isRoadOkey = false;
                debugger;
                let points = this.roadLine.split(",");
                let pts = points.map(item2 => {
                    var p = item2.split('|');
                    return new BMapGL.Point(parseFloat(p[1]), parseFloat(p[0]));
                });
                const line = new BMapGL.Polyline(pts, {
                    strokeColor: 'blue',
                    strokeWeight: 2,
                    strokeOpacity: 0.5
                });
                this.map.addOverlay(line);
                this.polylines.push(line);
                this.isRoadOkey = true;
            }
        },
        // 创建绑定事件的标记点
        getNewMarker(lng, lat) {
            let marker = new BMapGL.Marker(new BMapGL.Point(lng, lat), { enableDragging: true });
            // 添加点击事件，点击坐标点时，获取选中点
            marker.addEventListener("click", (e) => {
                e.domEvent.stopPropagation();
                this.curSelectMarker = e.currentTarget;
            });
            // 添加拖拽事件
            marker.addEventListener("dragend", (e) => {
                if (this.markers[0] === e.currentTarget) {
                    this.form.startLngLat = e.currentTarget.getPosition().lng + "," + e.currentTarget.getPosition().lat;
                } else if (this.markers.length > 1 && this.markers[this.markers.length - 1] === e.currentTarget) {
                    this.form.endLngLat = e.currentTarget.getPosition().lng + "," + e.currentTarget.getPosition().lat;
                }
                e.domEvent.stopPropagation();
                this.polylines.forEach(polyline => this.map.removeOverlay(polyline));
                this.polylines = [];
                this.searchRoad(true);
            });
            return marker;
        },
        // 删除记录的标记点
        removeMarker() {
            this.isRoadOkey = false;
            // 找到选中点
            let idx = this.markers.findIndex(item => item === this.curSelectMarker);
            // 如果查找失败则退出
            if (idx === -1) return;
            // 如果查找点为起始点且当前只有一个点，则将所有值赋空
            if (idx === 0 && this.markers.length === 1) {
                this.form.startLngLat = "";
                this.isRoadOkey = true;
                this.roadLine = '';
                // 如果查找点为起始点且当前有两个点，则将终点变为起点，将路线赋空
            } else if (idx === 0 && this.markers.length === 2) {
                let point = this.markers[1].getPosition();
                this.form.startLngLat = point.lng + "," + point.lat;
                this.form.endLngLat = "";
                this.markers[1].setIcon(this.startIcon);
                this.isRoadOkey = true;
                this.roadLine = '';
                // 如果查找点为起始点且当前有多个点，则更换起点并重新绘制路线
            } else if (idx === 0 && this.markers.length > 2) {
                let point = this.markers[1].getPosition();
                this.form.startLngLat = point.lng + "," + point.lat;
                this.markers[1].setIcon(this.startIcon);
                // 如果查找点为终点且当前只有两个点，则将路线及终点赋空
            } else if (idx === this.markers.length - 1 && this.markers.length === 2) {
                this.form.endLngLat = "";
                this.isRoadOkey = true;
                // 如果查找点为终点且当前有多个点，则更换终点并重新绘制路线
            } else if (idx === this.markers.length - 1 && this.markers.length > 2) {
                let point = this.markers[this.markers.length - 2].getPosition();
                this.form.endLngLat = point.lng + "," + point.lat;
                this.markers[this.markers.length - 2].setIcon(this.endIcon);
            }
            // 刷新点数组、覆盖物数组、路线
            this.markers.splice(idx, 1);
            this.map.removeOverlay(this.curSelectMarker);
            this.polylines.forEach(polyline => this.map.removeOverlay(polyline));
            this.polylines = [];
            this.curSelectMarker = null;
            this.searchRoad(true);
        },
        /**
         * 寻路
         * @param {boolean} isAll 是否重新绘制整条路线
         */
        searchRoad(isAll = false) {
            let _this = this;
            let longpatStr = isAll ? "" : this.roadLine;
            let reg = /,$/gi; //此处是正则
            let process = [];
            let index = 0;
            // 创造回调函数中的递归
            if (this.markers.length > 1) {
                if (isAll) {
                    for (let i = 0; i < this.markers.length - 1; i++) {
                        process.push([i, i + 1]);
                    }
                    // 如果不重新绘制整条路线，则只绘制最后两个点的路线
                } else {
                    process.push([this.markers.length - 2, this.markers.length - 1]);
                }
            }
            // 驾车实例
            let driving = new BMapGL.DrivingRoute(this.map, {
                // 搜索路线回调
                onSearchComplete: function (results) {
                    // 如果查找成功则继续
                    if (driving.getStatus() == BMAP_STATUS_SUCCESS) {
                        // 通过驾车实例，获得一系列点的数组
                        var pts = driving.getResults().getPlan(0).getRoute(0).getPath();
                        let pointList = [];
                        var paths = pts.length;
                        for (var i = 0; i < paths; i++) {
                            longpatStr += parseFloat(pts[i].lat) + "|" + parseFloat(pts[i].lng) + ",";
                            pointList.push(new BMapGL.Point(parseFloat(pts[i].lng), parseFloat(pts[i].lat)));
                        }
                        _this.polylines.push(new BMapGL.Polyline(pointList, {
                            strokeColor: 'blue',
                            strokeWeight: 2,
                            strokeOpacity: 0.5
                        }));
                        // 增加折线
                        _this.map.addOverlay(_this.polylines[_this.polylines.length - 1]); 
                        longpatStr = longpatStr.replaceAll("undefined", "");
                        longpatStr = longpatStr.replaceAll("null", "");
                        longpatStr = longpatStr.replace(reg, "");
                        _this.roadLine = longpatStr;
                    }
                    // 恢复点击事件
                    _this.isRoadOkey = true;
                    // 递归查询
                    if (index !== process.length) {
                        driving.search(_this.markers[process[index][0]].getPosition(), _this.markers[process[index][1]].getPosition());
                        index++;
                    }
                }
            });
            if (this.markers.length > 1) {
                if (isAll) {
                    driving.search(this.markers[process[index][0]].getPosition(), this.markers[process[index][1]].getPosition());
                } else {
                    driving.search(this.markers[process[index][0]].getPosition(), this.markers[process[index][1]].getPosition());
                }
                index++;
            }
        },
        // 保存
        onSaveBtnClick() {
            // 保存事件
            this.$message({
                title: '提示',
                message: '保存成功!'
            });
        },
        // 取消
        onCancleBtnClick() {
            // 取消事件
            this.$message({
                title: '提示',
                message: '取消成功!'
            });
        },
    },
});