<template>
	<div class="widget">
		<div class="widget-header">
			<h3>
				<slot name="title">-</slot>
			</h3>
			<div class="widget-header-toolbar">
				<a @click="clear" href="javascript:void(0)">
					<i class="i-topology i-topology-clear"></i>
					Clear
				</a>
				<a @click="save" href="javascript:void(0)">
					<i class="i-topology i-topology-ok"></i>
					Save
				</a>
			</div>
		</div>
		<div class="widget-content">
			<div class="left">
				<span class="left-bottom">
					<a class="i-topology i-topology-triangle-top" id="left-page-up" @click="leftpageup_click"></a>
					<a class="i-topology i-topology-triangle-bottom" id="left-page-down" @click="leftpagedown_click"></a>
				</span>
				<div class="left-page" id="left-page" :style="'margin-top:' + data.leftpageMarginTop" @dragstart.stop="leftpage_dragstart">
					<div class="panel-group" id="panel-group">
						<div class="panel panel-default">
							<div v-for="(menukey, menuindex) in Object.keys(menu)" :class="menu[menukey].open ? 'open' : ''">
								<div class="panel-heading" @click="menu[menukey].open = !menu[menukey].open">
									<h4 class="panel-title" style="font-size:12px;">
										<a>
											{{ menukey }}
											<i class="i-topology i-topology-angle-down pull-right"></i>
										</a>
									</h4>
								</div>
								<div :class="menu[menukey].open ? '' : 'collapse'" class="panel-collapse in" :id="'collapse' + menuindex">
									<div class="panel-body">
										<div :title="menukey" style="text-align: center;" v-for="(submenukey, submenuindex) in Object.keys(menu[menukey].submenu)" :class="submenukey" draggable="true">
											<i class="i-topology i-topology-removesign"></i>
											<span class="center">{{ submenukey }}</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
			<div class="center scrollbar">
				<div class="center-page" @dragover.prevent @drop.stop="centerpage_drop" id="center-page" data-demo-id="statemachine" data-library="dom">
					<div class="jtk-demo-main" style="max-width:none;position: relative;">
						<div class="jtk-demo-canvas canvas-wide statemachine-demo jtk-surface jtk-surface-nopan" id="canvas" style="position: relative;">
							<div class="row" v-for="(y, yindex) in data.layout_y"><div class="item" :id="'item-' + yindex + '-' + xindex" v-for="(x, xindex) in data.layout_x"></div></div>
						</div>
					</div>
				</div>
			</div>
			<div class="right"><slot name="right">-</slot></div>
		</div>
	</div>
</template>
<script>
// require.config({
// 	paths: {
// 		"E":"/Scripts/MyModle/FM"
// 	},
// 	urlArgs: "bust=" + (new Date()).getTime()
// })
const install = () => {
	delete window.coreTopology;
	delete window.coreTopologyUtil;
	delete window.coreTopologyUIComponent;
	delete window.coreTopologyInstance;
	delete window.Biltong;
	delete window.Katavorio;
	delete window.$;
	var require_cache_keys = Object.keys(require.cache);
	require_cache_keys.forEach(key => {
		if (
			key.indexOf('coreTopologyJs') > 0
			// && key.indexOf('coreTopologyJs/coreTopology.js')<0
		) {
			delete require.cache[key];
		}
	});
	__webpack_module_cache__ = {};
	require('./coreTopologyJs/jsBezier.js');
	require('./coreTopologyJs/mottle.js');
	require('./coreTopologyJs/biltong.js');
	require('./coreTopologyJs/katavorio.js');
	require('./coreTopologyJs/util.js');
	require('./coreTopologyJs/browser-util.js');
	require('./coreTopologyJs/coreTopology.js');
	require('./coreTopologyJs/dom-adapter.js');
	require('./coreTopologyJs/overlay-component.js');
	require('./coreTopologyJs/endpoint.js');
	require('./coreTopologyJs/connection.js');
	require('./coreTopologyJs/anchors.js');
	require('./coreTopologyJs/defaults.js');
	require('./coreTopologyJs/connectors-bezier.js');
	require('./coreTopologyJs/connectors-statemachine.js');
	require('./coreTopologyJs/renderers-svg.js');
	require('./coreTopologyJs/base-library-adapter.js');
	require('./coreTopologyJs/dom.coreTopology.js');
	require('./coreTopologyJs/demo.js');
};
import { getCurrentInstance, computed, reactive, watch, onUnmounted, onBeforeUnmount } from 'vue';
import './styles/index.less'; // global css
export default {
	name: 'TopologyEditor',
	props: {
		title: {
			type: String,
			default: ''
		},
		menu: {
			type: Object,
			default: {}
		},
		endpoints: {
			type: Object,
			default: []
		},
		lines: {
			type: Object,
			default: []
		},
		options: {
			type: Object,
			default: {}
		}
	},
	beforeCreate() {
		install();
	},
	setup(props, ctx) {
		//$.scrollTo("#body-start",0);
		const menu = computed(() => props.menu);
		const data = reactive({
			title: '',
			page: 1,
			layout_x: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}],
			layout_y: [{}, {}, {}, {}, {}],
			endpoints: [],
			lines: [],
			right: {
				type: 'unselect',
				title: 'unselect',
				index: -1,
				ip: 'unselect',
				overlay: 'link'
			},
			leftpageMarginTop: '',
			drag_target: null,
			drag_clone: null,
			drag_pid: null,
			targetLine: null
		});

		//left-page-up
		let leftpageup_click = () => {
			if (data.page > 1) {
				data.page--;
				data.leftpageMarginTop = '-' + (data.page - 1) * 480 + 'px';
			}
		};
		//left-page-down
		let leftpagedown_click = () => {
			if (data.page < 3) {
				data.page++;
				data.leftpageMarginTop = '-' + (data.page - 1) * 480 + 'px';
			}
		};
		//left-page
		let leftpage_touchstart = event => {
			// data.drag_target=event.target;
			// data.drag_clone.style.left = event.targetTouches[0].clientX-20 + "px";
			// data.drag_clone.style.top = event.targetTouches[0].clientY-20 + "px";
			//  event.dataTransfer.setData('Text', data.drag_target.id);
		};

		let leftpage_dragstart = event => {
			window.addEventListener(
				'DOMMouseScroll',
				function(e) {
					preventDefault(e);
				},
				{ passive: false }
			);
			data.drag_target = event.target;

			data.drag_clone = data.drag_target.cloneNode(true);
			data.drag_clone.style.position = 'absolute';
			data.drag_clone.style.zIndex = '20000';
			data.drag_clone.style.pointerEvents = 'none';
			data.drag_clone.classList.add('touch-move');
			// data.drag_clone.style.left = event.targetTouches[0].clientX-20 + "px";
			// data.drag_clone.style.top = event.targetTouches[0].clientY-20 + "px";
			// document.body.appendChild(data.drag_clone);
			//event.dataTransfer.setData('Text', drag_target.id);
		};
		//.widget-content
		let widgetcontent_touchmove = event => {
			// if(data.drag_clone){
			// 	if(event.target.classList.contains('item')){
			// 		data.drag_pid = event.target.id;
			// 	}
			// 	data.drag_clone.style.left = event.targetTouches[0].clientX-20 + "px";
			// 	data.drag_clone.style.top = event.targetTouches[0].clientY-20 + "px";
			// 	event.preventDefault();
			// }
		};
		let widgetcontent_touchend = event => {
			// 	if(data.drag_clone){
			// document.body.removeChild(data.drag_clone);
			//     	event.drag_clone = null;
			//     	var target = document.elementFromPoint(event.changedTouches[0].clientX,event.changedTouches[0].clientY);
			// 		if(target.classList.contains('item')){
			// 			data.drag_pid = target.id;
			// 		}
			// 		if(data.drag_pid){
			// 			if(data.drag_target.id){
			// 				document.querySelector("#"+data.drag_pid).appendChild(data.drag_target);
			// 			}else{
			// 				var clone = data.drag_target.cloneNode(true);
			// 				var clone_id = "topologychartWindow"+($.coreTopology.Endpoints_length+1);
			// 				var _data = {
			// 					id:clone_id,
			// 					ip:'unset',
			// 					parent_id:data.drag_pid
			// 				}
			// 				data.endpoints.push(_data);
			// 				add_endpoints(clone,_data);
			// 			}
			// 		}
			// 		data.drag_target=null;
			// 		event.preventDefault();
			// 	}
		};

		let centerpage_drop = event => {
			if (event.target.classList.contains('item') && data.drag_target) {
				if (data.drag_target.id) {
					event.target.appendChild(data.drag_target);
				} else {
					var clone = data.drag_target.cloneNode(true);
					var clone_id = 'topologychartWindow' + (window.$.coreTopology.Endpoints_length + 1);
					var _data = {
						id: clone_id,
						ip: 'unset',
						type: clone.className,
						attr: JSON.parse(JSON.stringify(menu.value[clone.title].submenu[clone.className])),
						parent_id: event.target.id
					};
					data.endpoints.push(_data);
					add_endpoints(clone, _data);
				}
			}
			data.drag_target = null;
		};
		data.targetLine = null;
		//right-port-select
		let LineOverlayChange = overlay => {
			if (data.targetLine) {
				var line = null;
				var obj = data.targetLine;
				for (var i = 0; i < data.lines.length; i++) {
					var _key = obj.sourceId + '_' + obj.endpoints[0].anchor.type + '-' + obj.targetId + '_' + obj.endpoints[1].anchor.type;
					if (data.lines[i].key == _key) {
						line = data.lines[i];
					}
				}
				line.value = overlay;
				data.targetLine.getOverlay('label').setLabel(overlay);
			}
		};
		
		// .querySelector('.i-topology-removesign')
		
		
		let reloadChildRight = (type, obj, childObj) => {
			data.right.type = type;
			var endpoints = null;
			var temp_option = childObj.getAttribute('option');
			for (var i = 0; i < data.endpoints.length; i++) {
				if (data.endpoints[i].id == obj.id) {
					endpoints = data.endpoints[i];
					data.right.index = i;
					data.endpoints[i].children.forEach((child,j)=>{
						if (child.id == childObj.id) {
							data.right.childIndex = j;
							data.right.id = childObj.id;
							data.right.title = temp_option;
							ctx.emit('select', { type, data: data.right });
							return;
						}
					})
					console.log(data.endpoints[i])
				}
			}
		}
		let reloadRight = (type, obj) => {
			data.right.type = type;
			if (type == 'endpoints') {
				var endpoints = null;
				for (var i = 0; i < data.endpoints.length; i++) {
					if (data.endpoints[i].id == obj.id) {
						endpoints = data.endpoints[i];
						data.right.index = i;
					}
				}
				var temp_option = obj.getAttribute('option');
				data.right.id = obj.id;
				data.right.title = temp_option;
				data.right.childIndex = -1;
				if(endpoints && endpoints.ip){
					data.right.ip = endpoints.ip;
				}
			} else if (type == 'lines') {
				var line = null;
				for (var i = 0; i < data.lines.length; i++) {
					var _key = obj.sourceId + '_' + obj.endpoints[0].anchor.type + '-' + obj.targetId + '_' + obj.endpoints[1].anchor.type;
					if (data.lines[i].key == _key) {
						line = data.lines[i];
						data.right.index = i;
					}
				}
				data.right.title = 'LINE';
				data.right.source = document.getElementById(line.sourceId).getAttribute('option');
				data.right.target = document.getElementById(line.targetId).getAttribute('option');
				data.right.overlay = line.value;
				data.targetLine = obj;
				obj.getOverlay('label').setLabel(line.value);
			}
			ctx.emit('select', { type, data: data.right });
		};
		let save = () => {
			let rtn = {};
			for (var i = 0; i < data.endpoints.length; i++) {
				var endpoint = data.endpoints[i];
				var dom_endpoint = document.getElementById(endpoint.id);
				endpoint.type = dom_endpoint.getAttribute('option');
				endpoint.top = dom_endpoint.style.top;
				endpoint.left = dom_endpoint.style.left;
				endpoint.parent_id = dom_endpoint.parentNode.id;
			}
			rtn.endpoints = data.endpoints;
			rtn.lines = data.lines;
			rtn.name = data.name;
			ctx.emit('save', rtn);
			return rtn;
		};
		let load = () => {
			setTimeout(() => {
				clear();
				for (var i = 0; i < data.endpoints.length; i++) {
					var _data = data.endpoints[i];
					add_endpoints(document.querySelector('.left-page .' + _data.type).cloneNode(true), _data);
				}
				for (var i = 0; i < data.lines.length; i++) {
					var _data = data.lines[i];
					window.$.coreTopology.addLine(_data);
				}
			}, 100);
		};
		let add_endpoints = (clone, _data) => {
			clone.id = _data.id;
			let findP = document.querySelector('#' + _data.parent_id);
			if(!findP){
				return
			}
			findP.appendChild(clone);
			clone.setAttribute('option', clone.className);
			let type = clone.className;
			clone.style.left = _data.left;
			clone.style.top = _data.top;
			clone.className+=' parentNode';
			if(props.options.endpoint){
				if(props.options.endpoint.format){
					clone.querySelector('.center').innerHTML=props.options.endpoint.format(_data);
				}
				if(props.options.endpoint.width){
					clone.style.width = `${props.options.endpoint.width}px`;
				}
				if(props.options.endpoint.height){
					clone.style.height = `${props.options.endpoint.height}px`;
				}else{
					clone.style.height = `80px`;
				}
			} else if (props.options[type]){
				if(props.options[type].format){
					clone.querySelector('.center').innerHTML=props.options[type].format(_data);
				}
				if(props.options[type].width){
					clone.style.width = `${props.options[type].width}px`;
				}
				if(props.options[type].height){
					clone.style.height = `${props.options[type].height}px`;
				}else{
					clone.style.height = `80px`;
				}
			}
			clone.style.position = 'absolute';
			
// @dragover.prevent @drop.stop="centerpage_drop"
			clone.ondragover = (e) => {
				e.preventDefault();
			}
			clone.ondrop = (event) => {
				if (event.target && data.drag_target) {
					if (data.drag_target.id) {
						event.target.appendChild(data.drag_target);
					} else {
						var cloneChild = data.drag_target.cloneNode(true);
						if(!props.options[type] 
						|| !props.options[type].childLimit 
						|| (props.options[type].childLimit!=true && !props.options[type].childLimit.find((item)=>cloneChild.className == item))){
							return;
						}
						var cloneChd_id = 'topologychartWindow' + (window.$.coreTopology.Endpoints_length + 1) +"-child-"+new Date().getTime();
						var childData = {
							id: cloneChd_id,
							ip: 'unset',
							type: cloneChild.className,
							attr: JSON.parse(JSON.stringify(menu.value[cloneChild.title].submenu[cloneChild.className])),
							parent_id: event.target.id
						};
						cloneChild.id = cloneChd_id;
						cloneChild.setAttribute('option', cloneChild.className);
						cloneChild.className+=' childNode';
						clone.style.height = ''+(clone.style.height.replace('px','')*1 + 40) +'px'
						clone.appendChild(cloneChild);
						// data.endpoints.push(childData);
						// add_endpoints(clone, _data);
						/* child click */
						// data.endpoints.push(_data);
						
						for (var i = 0; i < data.endpoints.length; i++) {
							if (data.endpoints[i].id == clone.id) {
								if(!data.endpoints[i].children){
									data.endpoints[i].children=[];
								}
								data.endpoints[i].children.push(childData);
							}
						}
						reloadChildRight('endpoints', clone, cloneChild);
						
						cloneChild.onclick = (e1) => {
							reloadChildRight('endpoints', clone, cloneChild);
							e1.stopPropagation();
						};
						var cloneChild_remove = cloneChild.querySelector('.i-topology-removesign');
						cloneChild_remove.setAttribute('target', cloneChd_id);
						cloneChild.querySelector('.i-topology-removesign').onclick = (e1) => {
							clone.removeChild(cloneChild);
							e1.stopPropagation();
						};
						/* child click */
					}
				}
				data.drag_target = null;
			}
			reloadRight('endpoints', clone);

			clone.onclick = (e) => {
				reloadRight('endpoints', clone);
			};
			var clone_remove = clone.querySelector('.i-topology-removesign');
			clone_remove.setAttribute('target', _data.id);
			clone.querySelector('.i-topology-removesign').onclick = () => {
				var id = clone.id;
				//$.coreTopology.instance.deleteEndpoint(coreTopology.getSelector("#"+id));
				var Endpoint = coreTopology.getSelector('#' + id);
				var anchors = $.coreTopology.instance.getEndpoints(Endpoint);
				if (anchors && anchors.length > 0) {
					var anchors_size = anchors.length - 1;
					//Endpoint.removeElement();
					for (var j = anchors_size; j >= 0; j--) {
						window.$.coreTopology.instance.deleteEndpoint(anchors[j]);
					}
				}
				document.querySelector('#' + id).parentNode.removeChild(document.querySelector('#' + id));
				for (var i = 0; i < data.endpoints.length; i++) {
					if (data.endpoints[i].id == id) {
						data.endpoints.slice(i, 1);
					}
				}
				var line_size = data.lines.length - 1;
				for (var i = line_size; i >= 0; i--) {
					if (data.lines[i].key.indexOf(id.replace('topologychart', '')) > -1) {
						data.lines.slice(i, 1);
					}
				}
			};
			window.$.coreTopology.addEndpoints(clone);
			window.$.coreTopology.fire(con => {
				var index = null;
				for (var i = 0; i < data.lines.length; i++) {
					var _key = con.sourceId + '_' + con.endpoints[0].anchor.type + '-' + con.targetId + '_' + con.endpoints[1].anchor.type;
					if (data.lines[i].key == _key) {
						index = i;
					}
				}
				if (index == null) {
					data.lines.push({
						id: con.id,
						key: con.sourceId + '_' + con.endpoints[0].anchor.type + '-' + con.targetId + '_' + con.endpoints[1].anchor.type,
						sourceAnchor: con.endpoints[0].anchor.type,
						targetAnchor: con.endpoints[1].anchor.type,
						sourceId: con.sourceId,
						targetId: con.targetId,
						value: ''
					});
					reloadRight('lines', con);
				} else {
					data.lines[index].id = con.id;
					reloadRight('lines', con);
				}
				con.getOverlay('label').unbind('tap');
				con.getOverlay('label').bind('tap', () => {
					reloadRight('lines', con);
				});
			});
		};
		let clear = () => {
			if (window.$ && window.$.coreTopology) {
				window.$.coreTopology.instance.reset();
				window.$.coreTopology.instance.clear();
			}
			var _tragets = document.querySelectorAll('.center .item .coretopology-draggable');
			_tragets.forEach(node => {
				node.parentNode.removeChild(node);
			});
		};
		watch(
			() => props.title,
			val => {
				data.title = val;
			},
			{ immediate: true }
		);
		watch(
			() => data.title,
			val => {
				ctx.emit('update:title', val);
			}
		);
		watch(
			() => props.endpoints,
			val => {
				data.endpoints = val;
				load();
			},
			{ immediate: true }
		);
		watch(
			() => data.endpoints,
			val => {
				ctx.emit('update:endpoints', val);
			}
		);
		watch(
			() => props.lines,
			val => {
				data.lines = val;
				load();
			},
			{ immediate: true }
		);
		watch(
			() => data.lines,
			val => {
				ctx.emit('update:lines', val);
			}
		);
		return {
			data,
			menu,
			leftpageup_click,
			leftpagedown_click,
			leftpage_dragstart,
			centerpage_drop,
			LineOverlayChange,
			reloadRight,
			save,
			load,
			add_endpoints,
			clear
		};
	},
	components: {}
};
</script>
<style lang="less" scoped></style>
