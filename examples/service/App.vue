<template>
  <div id="app">
  	<div style="padding:10px">
        <TopologyEditor 
					ref="topoEditor"
					style="box-shadow:0 0 3px 3px rgba(0,0,0,0.1);border-radius:10px" 
					:menu="menu" 
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
								<div class="row" v-if="rightData.index>-1 && (rightType=='line'?lines:endpoints)[rightData.index].attr">
									<p class="data-row"  v-for="(rkey,rindex) in (rightType=='line'?lines:endpoints)[rightData.index].attr" >
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
								<div class="row" v-if="rightData.index>-1 && (rightType=='line'?lines:endpoints)[rightData.index].attr">
									<p class="data-row" v-for="(rkey,rindex) in (rightType=='line'?lines:endpoints)[rightData.index].attr" >
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

export default {
  name: "App",
  data() {
    return {
			title:'MyApp',
			lines:[
				{"id":"con_28","key":"topologychartWindow1_Continuous-topologychartWindow3_Continuous","sourceAnchor":"Continuous","targetAnchor":"Continuous","sourceId":"topologychartWindow1","targetId":"topologychartWindow3","port":"80"},
				{"id":"con_33","key":"topologychartWindow1_Continuous-topologychartWindow2_Continuous","sourceAnchor":"Continuous","targetAnchor":"Continuous","sourceId":"topologychartWindow1","targetId":"topologychartWindow2","port":"80"}
			], 
			endpoints:[
				{"id":"topologychartWindow1","type":"LVS","ip":"192.168.1.1","top":"50px","left":"","parent_id":"item-0-1",attr:[{label:'Attr A',type:'label',value:'A'},{label:'Attr B',type:'input',value:'B'}]},
				{"id":"topologychartWindow2","type":"PostgreSQL","ip":"192.168.1.1","top":"50px","left":"","parent_id":"item-0-3",attr:[{label:'Attr A',type:'label',value:'A'},{label:'Attr B',type:'input',value:'B'}]},
				{"id":"topologychartWindow3","type":"Tomcat","ip":"192.168.1.1","top":"253px","left":"340px","parent_id":"item-1-1",attr:[{label:'Attr A',type:'label',value:'A'},{label:'Attr B',type:'input',value:'B'}]},
			],
			menu:{
				Cluster:{
					open:true,
					submenu:{
						'LVS':[{label:'Attr A',type:'label',value:'Empty'},{label:'Attr B',type:'input',value:'Empty'}],
						'Nginx':[{label:'Attr A',type:'label',value:'Empty'},{label:'Attr B',type:'input',value:'Empty'}],
						'Haproxy':[{label:'Attr A',type:'label',value:'Empty'},{label:'Attr B',type:'input',value:'Empty'}]
					}
				},
				Server:{
					open:false,
					submenu:{
						'JBoss':[{label:'Attr A',type:'label',value:'Empty'},{label:'Attr B',type:'input',value:'Empty'}],
						'Tomcat':[{label:'Attr A',type:'label',value:'Empty'},{label:'Attr B',type:'input',value:'Empty'}],
						'NodeJS':[{label:'Attr A',type:'label',value:'Empty'},{label:'Attr B',type:'input',value:'Empty'}]
					}
				},
				DB:{
					open:false,
					submenu:{
						'MySQL':[{label:'Attr A',type:'label',value:'Empty'},{label:'Attr B',type:'input',value:'Empty'}],
						'PostgreSQL':[{label:'Attr A',type:'label',value:'Empty'},{label:'Attr B',type:'input',value:'Empty'}],
						'MongoDB':[{label:'Attr A',type:'label',value:'Empty'},{label:'Attr B',type:'input',value:'Empty'}]
					}
				},
				Cache:{
					open:false,
					submenu:{
						'Memcache':[{label:'Attr A',type:'label',value:'Empty'},{label:'Attr B',type:'input',value:'Empty'}],
						'Redis':[{label:'Attr A',type:'label',value:'Empty'},{label:'Attr B',type:'input',value:'Empty'}],
						'JBossDataGrid':[{label:'Attr A',type:'label',value:'Empty'},{label:'Attr B',type:'input',value:'Empty'}]
					}
				},
				Msg:{
					open:false,
					submenu:{
						'Kafka':[{label:'Attr A',type:'label',value:'Empty'},{label:'Attr B',type:'input',value:'Empty'}],
						'ActiveMQ':[{label:'Attr A',type:'label',value:'Empty'},{label:'Attr B',type:'input',value:'Empty'}]
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
	.LVS,.Nginx,.Haproxy{
		background-image:url(assets/img/jq.png);
		
		background-position: center 10px;
		background-size:60px auto;
	}
	.JBoss,.Tomcat,.NodeJS{
		background-image:url(assets/img/ic.png);
		background-position: center 10px;
		background-size:65px auto;
	}
	.MySQL,.PostgreSQL,.MongoDB,.Memcache,.Redis,.JBossDataGrid,.Kafka,.ActiveMQ{
		background-image:url(assets/img/db.png);
		background-position: center 8px;
		background-size:50px 50px;
	}
	
	.LVS:before,.Nginx:before,.Haproxy:before{
		display: block;
		left: 18px;
		top:15px;
		width: 25px;
		height: 22px;
	}
	.JBoss:before,.Tomcat:before,.NodeJS:before{
		display: block;
		left: 24px;
		top:21px;
		width: 30px;
		height: 20px;
	}
	.MySQL:before,.PostgreSQL:before,.MongoDB:before,.Memcache:before,.Redis:before,.JBossDataGrid:before,.Kafka:before,.ActiveMQ:before{
		left: 22px;
		top:26px;
		display: block;
		width: 38px;
		height: 20px;
	}
	.LVS:before{
		background-image:url(assets/img/LVS.png);
	}
	.Nginx:before{
		background-image:url(assets/img/nginx.png);
	}
	.Haproxy:before{
		background-image:url(assets/img/haproxy.png);
	}
	.JBoss:before{
		background-image:url(assets/img/jboss.png);
	}
	.Tomcat:before{
		background-image:url(assets/img/tomcat.png);
	}
	.NodeJS:before{
		background-image:url(assets/img/nodejs.png);
	}
	.MySQL:before{
		background-image:url(assets/img/mysql.png);
	}
	.PostgreSQL:before{
		background-image:url(assets/img/postgresql.png);
	}
	.MongoDB:before{
		background-image:url(assets/img/mongodb.png);
	}
	.Memcache:before{
		background-image:url(assets/img/memcached.png);
	}
	.Redis:before{
		background-image:url(assets/img/redis.png);
	}
	.JBossDataGrid:before{
		background-image:url(assets/img/jbossdg.png);
	}
	.Kafka:before{
		background-image:url(assets/img/kafka.png);
	}
	.ActiveMQ:before{
		background-image:url(assets/img/activemq.png);
	}
	}
</style>
