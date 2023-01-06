<template>
  <div id="app">
  	<div style="padding:10px">
        <TopologyEditor 
					ref="topoEditor"
					style="box-shadow:0 0 3px 3px rgba(0,0,0,0.1);border-radius:10px" 
					:menu="menu"
					:options="{endpoint:{width:200,format:(_d)=>`${_d.type}: ${_d.attr[0].value}`}}"
					v-model:title="title" 
					v-model:lines="lines" 
					v-model:endpoints="endpoints" 
					@save="save"
					@select="select"
				>
					<template #right >
						<div v-if="rightData">
							<div id="right-unselect" v-show="!rightType || rightType=='unselect'">
								<br/>
								<div class="row" style="text-align: center;color:#999"><em>- none -</em></div>
							</div>
							<div id="right-endpoint" v-show="rightType=='endpoints'">
								<div class="touch-move" :class="rightData.title" style="box-shadow: none;margin: 20px auto auto auto;border-radius: 50%;background-position: center;border:1px dashed #ddd;background-color: transparent;"></div>
								<div class="row" style="text-align: center;"><h3>{{rightData.title}}</h3></div>
								<div class="row" v-if="rightData.index>-1 && (rightType=='lines'?lines:endpoints)[rightData.index].attr">
									<p class="data-row"  v-for="(rkey,rindex) in (rightType=='lines'?lines:endpoints)[rightData.index].attr" >
										<b class="data-name">
											{{rkey.label}}
										</b>
										<span class="data-value" v-if="rkey.type=='label'">{{rkey.value}}</span>
										<span class="data-value" v-if="rkey.type=='input'">
											<input style="width:80px" type="text" placeholder="" v-model="rkey.value"/>
										</span>
									</p>
								</div>
							</div>
							<div id="right-line" v-show="rightType=='lines'">
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
									<p class="data-row">
										<b class="data-name">
											Port								
										</b>
										<span class="data-value" >
											<input style="width:80px" type="text" placeholder="" @input="changeOverlay(rightData.overlay)" v-model="rightData.overlay"/>
										</span>
									</p>
								</div>
								<div class="row" v-if="rightData.index>-1 && (rightType=='lines'?lines:endpoints)[rightData.index].attr">
									<p class="data-row" v-for="(rkey,rindex) in (rightType=='lines'?lines:endpoints)[rightData.index].attr" >
										<b class="data-name">
											{{rkey.label}}
										</b>
										<span class="data-value" v-if="rkey.type=='label'">{{rkey.value}}</span>
										<span class="data-value" v-if="rkey.type=='input'">
											<input style="width:80px" type="text" placeholder="" v-model="rkey.value"/>
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
import TopologyEditor from './../../packages/index';
// import TopologyEditor from './../lib/drag-topology-editor-vue3.umd.js';
// import './../../lib/drag-topology-editor-vue3.css';
// import './../../packages/';

export default {
  name: "App",
  data() {
    return {
			title:'MyApp',
			lines:[
				{"id":"con_28","key":"topologychartWindow1_Continuous-topologychartWindow3_Continuous","sourceAnchor":"Continuous","targetAnchor":"Continuous","sourceId":"topologychartWindow1","targetId":"topologychartWindow3","port":"link"},
				{"id":"con_33","key":"topologychartWindow1_Continuous-topologychartWindow2_Continuous","sourceAnchor":"Continuous","targetAnchor":"Continuous","sourceId":"topologychartWindow1","targetId":"topologychartWindow2","port":"link"}
			], 
			endpoints:[
				{"id":"topologychartWindow1","type":"Pipeline","ip":"192.168.1.1","top":"50px","left":"","parent_id":"item-0-1",attr:[{label:'Name',type:'input',value:'request'}]},
				{"id":"topologychartWindow2","type":"Pipeline","ip":"192.168.1.1","top":"50px","left":"","parent_id":"item-0-3",attr:[{label:'Name',type:'input',value:'sso'}]},
				{"id":"topologychartWindow3","type":"Pipeline","ip":"192.168.1.1","top":"253px","left":"340px","parent_id":"item-1-1",attr:[{label:'Name',type:'input',value:'validate'}]},
			],
			menu:{
				Struct:{
					open:true,
					submenu:{
						'Pipeline':[{label:'Name',type:'input',value:'Pipeline'}],
					}
				},
				Event:{
					open:true,
					submenu:{
						'MessageStart':[
							{label:'Name',type:'label',value:'handleMessageStart'},
							{label:'Handle',type:'function',value:`msg => ((params,cookie,url)=>())()`},
						],
						'MessageEnd':[
							{label:'Name',type:'label',value:'handleMessageEnd'},
							{label:'Handle',type:'function',value:`msg => ((params,cookie,url)=>())()`},
						],
					}
				},
				Operator:{
					open:true,
					submenu:{
						'Dump':[
							{label:'Params',type:'array',value:[{label:'Text',type:'string',value:''}]},
						],
					}
				},
			},
			rightData:null,
    }
  },
  components: {
    TopologyEditor
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
			.center{
				top: 12px !important;
			}
			.Pipeline{
				background-image:url(assets/img/pipeline.png);
				background-position: 10px 10px;
				background-size:20px auto;
				background-repeat: no-repeat;
			}
			.MessageStart{
				background-image:url(assets/img/event.png);
				background-position: 10px 10px;
				background-size:20px auto;
				background-repeat: no-repeat;
			}
			.MessageEnd{
				background-image:url(assets/img/event.png);
				background-position: 10px 10px;
				background-size:20px auto;
				background-repeat: no-repeat;
			}
			.Dump{
				background-image:url(assets/img/log.png);
				background-position: 10px 10px;
				background-size:20px auto;
				background-repeat: no-repeat;
			}
		}
		.left-page,#right-endpoint{
			.Pipeline{
				background-image:url(assets/img/pipeline.png);
				background-position: center 10px;
				background-size:40px auto;
				background-repeat: no-repeat;
			}
			.MessageStart{
				background-image:url(assets/img/event.png);
				background-position: center 10px;
				background-size:50px auto;
				background-repeat: no-repeat;
			}
			.MessageEnd{
				background-image:url(assets/img/event.png);
				background-position: center 10px;
				background-size:50px auto;
				background-repeat: no-repeat;
			}
			.Dump{
				background-image:url(assets/img/log.png);
				background-position: center 10px;
				background-size:50px auto;
				background-repeat: no-repeat;
			}
			// .LVS:before{
			// 	background-image:url(assets/img/LVS.png);
			// }
		}
	}
</style>
