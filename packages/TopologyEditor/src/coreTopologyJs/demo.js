coreTopology.ready(function () {
	$={}
	$.coreTopology={};
	$.coreTopology.Endpoints_length = 0;
    // setup some defaults for coreTopology.
    var instance = coreTopology.getInstance({
        Endpoint: ["Dot", {radius: 2}],
        Connector:"StateMachine",
        HoverPaintStyle: {strokeStyle: "#1e8151", lineWidth: 2 },
        ConnectionOverlays: [
            [ "Arrow", {
                location: 1,
                id: "arrow",
                length: 14,
                foldback: 0.8
            } ],
            [ "Label", { label: "PORT", id: "label", cssClass: "aLabel" }]
        ],
        Container: "svg"
    });

    instance.registerConnectionType("basic", { anchor:"Continuous", connector:"StateMachine" });

    $.coreTopology.instance = window.jsp = instance;

    // var canvas = document.getElementById("canvas");
    var windows = coreTopology.getSelector(".statemachine-demo .w");

    // bind a click listener to each connection; the connection is deleted. you could of course
    // just do this: coreTopology.bind("click", coreTopology.detach), but I wanted to make it clear what was
    // happening.
    instance.bind("dblclick", function (c) {
        instance.detach(c);
    });
    var s_time =0;
    instance.bind("mousedown", function (c) {
		s_time = new Date().getTime();
    });
    var e_time =0;
    instance.bind("mouseup", function (c) {
		e_time = new Date().getTime();
		if((e_time - s_time) > 300) {
			instance.detach(c);
		}
		e_time=0,s_time=0;
    });

    // bind a connection listener. note that the parameter passed to this function contains more than
    // just the new connection - see the documentation for a full list of what is included in 'info'.
    // this listener sets the connection's internal
    // id as the label overlay's text.
    instance.bind("connection", function (info) {
        info.connection.getOverlay("label").setLabel(info.connection.id);
    });

    //
    // initialise element as connection targets and source.
    //
    var initNode = function(el) {

        // initialise draggable elements.
        instance.draggable(el);

        instance.makeSource(el, {
            filter: ".ep",
            anchor: "Continuous",
            connectorStyle: { strokeStyle: "#5c96bc", lineWidth: 2, outlineColor: "transparent", outlineWidth: 4 },
            connectionType:"basic",
            extract:{
                "action":"the-action"
            },
            maxConnections: 10,
            onMaxConnections: function (info, e) {
                alert("Maximum connections (" + info.maxConnections + ") reached");
            }
        });

        instance.makeTarget(el, {
            dropOptions: { hoverClass: "dragHover" },
            anchor: "Continuous",
            allowLoopback: true
        });

        // this is not part of the core demo functionality; it is a means for the Toolkit edition's wrapped
        // version of this demo to find out about new nodes being added.
        //
        instance.fire("coreTopologyDemoNodeAdded", el);
    };

    $.coreTopology.addEndpoints = function(dom) {
        $.coreTopology.Endpoints_length++;
        var id = coreTopologyUtil.uuid();
        dom.classList.add("w");
        //dom.id = id;
        //instance.getContainer().appendChild(dom);
		var _div = document.createElement("div")
		_div.classList.add("ep")
		_div.setAttribute("action",dom.id)
        dom.appendChild(_div);
        initNode(dom);
        return dom;
    };

	$.coreTopology.addLine = function(data){
		 $.coreTopology.instance.connect({source: data.sourceId, target: data.targetId, type:"basic" , editable: true});
	}
    // suspend drawing and initialise.
    /*instance.batch(function () {
        for (var i = 0; i < windows.length; i++) {
            initNode(windows[i], true);
        }
        // and finally, make a few connections
        instance.connect({ source: "opened", target: "phone1", type:"basic" });
        instance.connect({ source: "phone1", target: "phone1", type:"basic" });
        instance.connect({ source: "phone1", target: "inperson", type:"basic" });

        instance.connect({
            source:"phone2",
            target:"rejected",
            type:"basic"
        });
    });*/

    coreTopology.fire("coreTopologyDemoLoaded", instance);
    
    
	$.coreTopology.fire = function(call){
        $.coreTopology.instance.unbind("connection");
        // listen for new connections; initialise them the same way we initialise the connections at startup.
        $.coreTopology.instance.bind("connection", function (con, originalEvent) {
  
			//connection.getOverlay("label").setLabel("[port]");
			
			var Endpoint = coreTopology.getSelector("#"+con.sourceId);
			var anchors = $.coreTopology.instance.getEndpoints(Endpoint);
			var has_size=0;
			if(anchors && anchors.length>0){
				var anchors_size = anchors.length-1;
				//Endpoint.removeElement();
				for(var j =anchors_size;j>=0;j--){
					for(var k=0;k<anchors[j].connections.length;k++){
						
						if(anchors[j].connections[k].sourceId == con.sourceId
						&& anchors[j].connections[k].targetId == con.targetId){
							has_size++;
						}
					}
				}
			}
			if(has_size >1){
				$.coreTopology.instance.detach(con);
				return;
			}
			call(con.connection)
            //connection.getOverlay("label").setLabel(connection.sourceId.substring(15) + "-" + connection.targetId.substring(15));
        
        });
		coreTopology.fire("coreTopologyDemoLoaded", $.coreTopology.instance);
	}
	window.$ = $;
});
