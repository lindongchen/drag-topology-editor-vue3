<template>
  <div id="app">
  	<div style="padding:10px">
        <TopologyEditor 
					ref="topoEditor"
					style="box-shadow:0 0 3px 3px rgba(0,0,0,0.1);border-radius:10px" 
					:menu="menu" 
					:options="{Service:{childLimit:['UpstreamSetting','Egress'],width:250}}"
					v-model:lines="lines" 
					v-model:endpoints="endpoints" 
					@save="save"
					@select="select"
				>
					<template #title >
						<input type="text" placeholder="Name" v-model="title" />
						<select
						  v-model="namespace"
						  placeholder="Namespace"
						>
						  <option
						    :key="index3"
						    v-for="(ns, index3) in namespaces"
						    :value="ns.value"
						  >
						    {{ ns.label }}
						  </option>
						</select>
					</template>
					<template #right >
						<div v-if="rightData">
							<div id="right-unselect" v-show="!rightType || rightType=='unselect'">
								<br/>
								<div class="row" style="text-align: center;color:#999"><em>- none -</em></div>
							</div>
							<div id="right-endpoint" v-if="rightType=='endpoints'">
								<div class="touch-move" :class="rightData.title" style="box-shadow: none;margin: 20px auto auto auto;border-radius: 50%;background-position: center;border:1px dashed #ddd;background-color: transparent;"></div>
								<div class="row" style="text-align: center;"><h3>{{rightData.title}}</h3></div>
								<div class="row" v-if="rightData.childIndex>-1 && endpoints[rightData.index].children[rightData.childIndex].attr">
									<p class="data-row"  v-for="(rkey,rindex) in endpoints[rightData.index].children[rightData.childIndex].attr" >
										<b class="data-name">
											{{rkey.label}}
										</b>
										<AutoItem v-if="rkey?.type" :field="rkey"/>
									</p>
								</div>
								<div class="row" v-else-if="rightData.index>-1 && endpoints[rightData.index].attr">
									<p class="data-row"  v-for="(rkey,rindex) in endpoints[rightData.index].attr" >
										<b class="data-name">
											{{rkey.label}}
										</b>
										<AutoItem v-if="rkey?.type" :field="rkey"/>
									</p>
								</div>
							</div>
							<div id="right-line" v-else-if="rightType=='lines'">
								<div class="row" style="text-align: center;"><h3>{{rightData.title}}</h3></div>
								<div class="row">
									
									<p class="data-row">
										<b class="data-name">
											Source
										</b>
										<span class="data-value" >
											{{rightData.source}}
										</span>
									
									</p>
									<p class="data-row">
										<b class="data-name">
											Target
										</b>
										<span class="data-value" >
											{{rightData.target}}
										</span>
									</p>
									<p class="data-row" v-if="rightData.source == 'Split' && rightData.target == 'Service'">
										<b class="data-name">
											Weight								
										</b>
										<span class="data-value" >
											<input style="width:80px" type="text" placeholder="" @input="changeOverlay(rightData.overlay)" v-model="rightData.overlay"/>
										</span>
									</p>
								</div>
							</div>
						</div>
					</template>
				</TopologyEditor>
  	</div>
  </div>
</template>
<script>
// import TopologyEditor from './../../packages/index';
import AutoItem from './components/AutoItem';
import TopologyEditor from './../../lib/drag-topology-editor-vue3.umd.js';
import './../../lib/drag-topology-editor-vue3.css';
let namespaces = [{label:'ns1',value:'ns1'},{label:'ns2',value:'ns2'}];
let methods = [{label:'*',value:'*'},{label:'GET',value:'GET'},{label:'POST',value:'POST'}];
let accounts = [{label:'account1',value:'account1',namespace:'ns1'},{label:'account2',value:'account2',namespace:'ns1'}];
export default {
  name: "App",
  data() {
    return {
			title:'MyApp',
			namespace:null,
			lines:[
			], 
			endpoints:[
			],
			namespaces,
			menu:{
				Traffic:{
					open:true,
					submenu:{
						'Target':[
							{label:'Name',type:'text',value:''},
							{label:'Namespace',type:'select',value:null,options:namespaces},
						],
						'Split':[
							{label:'Name',type:'text',value:''},
						],
						'UpstreamSetting':[
							{label:'Name',type:'text',value:''},
							{label:'Host',type:'text',value:''},
							{label:'Tcp Max Connections',type:'number',value:1},
							{label:'Http Max Pending Requests',type:'number',value:1},
							{label:'Http Max Requests Per Connection',type:'number',value:1},
						],
						'Metric':[],
					}
				},
				Rules:{
					open:true,
					submenu:{
						'HTTPGroup':[
							{label:'Name',type:'text',value:''},
							{label:'Path Regex',type:'text',value:'/metrics'},
							{label:'Methods',type:'select',value:null,options:methods},
						],
						'TCP':[
							{label:'Name',type:'text',value:''},
							{label:'Port',type:'number',value:0},
						],
					}
				},
				K8S:{
					open:true,
					submenu:{
						'Service':[
							{label:'Name',type:'select',value:null,
								options:[
									{label:'service1',value:'service1'},
									{label:'service2',value:'service2'},
								],
							}
						],
						'Account':[
							{label:'Name',type:'select',value:null,options:accounts}
						],
						'Egress':[
							{label:'Name',type:'text',value:''},
						],
					}
				},
			},
			rightData:null,
    }
  },
  components: {
    TopologyEditor,AutoItem
  },
  methods:{
	  save(data){
		  alert(data);
	  },
		select(d){
			this.rightData=d.data;
			this.rightType=d.type;
		},
		changeOverlay(val){
			this.$refs.topoEditor.LineOverlayChange(val);
		}
  },
  mounted(){
  }
};
</script>
<style lang="less" scoped>
	&:deep{
		.center-page{
			.Service{
				background-image:url(assets/img/service.svg);
				background-position: 10px 10px;
				background-size:20px auto;
				background-repeat: no-repeat;
			}
			.Service .center{
				top: 12px !important;
			}
			.Service:before{
				height: 5px;
			}
			.parentNode .childNode{
				background-position: 10px 10px;
				background-size:20px auto;
				background-repeat: no-repeat;
			}
		}
		.Target{
			background-image:url(assets/img/traffic.svg);
			background-position: center 10px;
			background-size:50px auto;
			background-repeat: no-repeat;
		}
		.Split{
			background-image:url(assets/img/split.svg);
			background-position: center 10px;
			background-size:50px auto;
			background-repeat: no-repeat;
		}
		.Metric{
			background-image:url(assets/img/metric.svg);
			background-position: center 10px;
			background-size:45px auto;
			background-repeat: no-repeat;
		}
		.HTTPGroup{
			background-image:url(assets/img/http.svg);
			background-position: center 10px;
			background-size:45px auto;
			background-repeat: no-repeat;
		}
		.TCP{
			background-image:url(assets/img/tcp.png);
			background-position: center 10px;
			background-size:45px auto;
			background-repeat: no-repeat;
		}
		.Service{
			background-image:url(assets/img/service.svg);
			background-position: center 10px;
			background-size:52px auto;
			background-repeat: no-repeat;
		}
		.Pipeline{
			background-image:url(assets/img/service.svg);
			background-position: 10px 10px;
			background-size:20px auto;
			background-repeat: no-repeat;
		}
		.Account{
			background-image:url(assets/img/account.svg);
			background-position: center 10px;
			background-size:45px auto;
			background-repeat: no-repeat;
		}
		.Egress{
			background-image:url(assets/img/export.svg);
			background-position: center 10px;
			background-size:45px auto;
			background-repeat: no-repeat;
		}
		
		.UpstreamSetting{
			background-image:url(assets/img/upstreamSetting.svg);
			background-position: center 10px;
			background-size:45px auto;
			background-repeat: no-repeat;
		}
		
		.Target:before,.Split:before,.Metric:before,.HTTPGroup:before,.TCP:before,.Service:before,.Account:before,.UpstreamSetting:before,.Egress:before{
			display: block;
			left: 18px;
			width: 25px;
			height: 20px;
		}
	}
</style>
