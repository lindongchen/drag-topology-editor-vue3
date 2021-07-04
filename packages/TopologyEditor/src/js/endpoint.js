;(function () {

    "use strict";
    var root = this, _jp = root.coreTopology, _ju = root.coreTopologyUtil;

    // create the drag handler for a connection
    var _makeConnectionDragHandler = function (endpoint, placeholder, _coreTopology) {
        var stopped = false;
        return {
            drag: function () {
                if (stopped) {
                    stopped = false;
                    return true;
                }

                if (placeholder.element) {
                    var _ui = _coreTopology.getUIPosition(arguments, _coreTopology.getZoom());
                    coreTopology.setPosition(placeholder.element, _ui);
                    _coreTopology.repaint(placeholder.element, _ui);
                    // always repaint the source endpoint, because only continuous/dynamic anchors cause the endpoint
                    // to be repainted, so static anchors need to be told (or the endpoint gets dragged around)
                    endpoint.paint({anchorPoint:endpoint.anchor.getCurrentLocation({element:endpoint.element})});
                }
            },
            stopDrag: function () {
                stopped = true;
            }
        };
    };

    // creates a placeholder div for dragging purposes, adds it, and pre-computes its offset.
    var _makeDraggablePlaceholder = function (placeholder, _coreTopology, ipco, ips) {
        var n = coreTopology.createElement("div", { position : "absolute" });
        _coreTopology.appendElement(n);
        var id = _coreTopology.getId(n);
        coreTopology.setPosition(n, ipco);
        n.style.width = ips[0] + "px";
        n.style.height = ips[1] + "px";
        _coreTopology.manage(id, n, true); // TRANSIENT MANAGE
        // create and assign an id, and initialize the offset.
        placeholder.id = id;
        placeholder.element = n;
    };

    // create a floating endpoint (for drag connections)
    var _makeFloatingEndpoint = function (paintStyle, referenceAnchor, endpoint, referenceCanvas, sourceElement, _coreTopology, _newEndpoint, scope) {
        var floatingAnchor = new _jp.FloatingAnchor({ reference: referenceAnchor, referenceCanvas: referenceCanvas, coreTopologyInstance: _coreTopology });
        //setting the scope here should not be the way to fix that mootools issue.  it should be fixed by not
        // adding the floating endpoint as a droppable.  that makes more sense anyway!
        // TRANSIENT MANAGE
        return _newEndpoint({
            paintStyle: paintStyle,
            endpoint: endpoint,
            anchor: floatingAnchor,
            source: sourceElement,
            scope: scope
        });
    };

    var typeParameters = [ "connectorStyle", "connectorHoverStyle", "connectorOverlays",
        "connector", "connectionType", "connectorClass", "connectorHoverClass" ];

    // a helper function that tries to find a connection to the given element, and returns it if so. if elementWithPrecedence is null,
    // or no connection to it is found, we return the first connection in our list.
    var findConnectionToUseForDynamicAnchor = function (ep, elementWithPrecedence) {
        var idx = 0;
        if (elementWithPrecedence != null) {
            for (var i = 0; i < ep.connections.length; i++) {
                if (ep.connections[i].sourceId == elementWithPrecedence || ep.connections[i].targetId == elementWithPrecedence) {
                    idx = i;
                    break;
                }
            }
        }

        return ep.connections[idx];
    };

    _jp.Endpoint = function (params) {
        var _coreTopology = params._coreTopology,
            _newConnection = params.newConnection,
            _newEndpoint = params.newEndpoint;

        this.idPrefix = "_coretopology_e_";
        this.defaultLabelLocation = [ 0.5, 0.5 ];
        this.defaultOverlayKeys = ["Overlays", "EndpointOverlays"];
        _jp.OverlayCapableJsPlumbUIComponent.apply(this, arguments);

// TYPE

        this.appendToDefaultType({
            connectionType:params.connectionType,
            maxConnections: params.maxConnections == null ? this._coreTopology.instance.Defaults.MaxConnections : params.maxConnections, // maximum number of connections this endpoint can be the source of.,
            paintStyle: params.endpointStyle || params.paintStyle || params.style || this._coreTopology.instance.Defaults.EndpointStyle || _jp.Defaults.EndpointStyle,
            hoverPaintStyle: params.endpointHoverStyle || params.hoverPaintStyle || this._coreTopology.instance.Defaults.EndpointHoverStyle || _jp.Defaults.EndpointHoverStyle,
            connectorStyle: params.connectorStyle,
            connectorHoverStyle: params.connectorHoverStyle,
            connectorClass: params.connectorClass,
            connectorHoverClass: params.connectorHoverClass,
            connectorOverlays: params.connectorOverlays,
            connector: params.connector,
            connectorTooltip: params.connectorTooltip
        });

// END TYPE

        this._coreTopology.enabled = !(params.enabled === false);
        this._coreTopology.visible = true;
        this.element = _jp.getElement(params.source);
        this._coreTopology.uuid = params.uuid;
        this._coreTopology.floatingEndpoint = null;
        var inPlaceCopy = null;
        if (this._coreTopology.uuid) params.endpointsByUUID[this._coreTopology.uuid] = this;
        this.elementId = params.elementId;
        this.dragProxy = params.dragProxy;

        this._coreTopology.connectionCost = params.connectionCost;
        this._coreTopology.connectionsDirected = params.connectionsDirected;
        this._coreTopology.currentAnchorClass = "";
        this._coreTopology.events = {};

        var _updateAnchorClass = function () {
            // stash old, get new
            var oldAnchorClass = _coreTopology.endpointAnchorClassPrefix + "-" + this._coreTopology.currentAnchorClass;
            this._coreTopology.currentAnchorClass = this.anchor.getCssClass();
            var anchorClass = _coreTopology.endpointAnchorClassPrefix + (this._coreTopology.currentAnchorClass ? "-" + this._coreTopology.currentAnchorClass : "");

            this.removeClass(oldAnchorClass);
            this.addClass(anchorClass);
            // add and remove at the same time to reduce the number of reflows.
            coreTopology.updateClasses(this.element, anchorClass, oldAnchorClass);
        }.bind(this);

        this.prepareAnchor = function(anchorParams) {
            var a = this._coreTopology.instance.makeAnchor(anchorParams, this.elementId, _coreTopology);
            a.bind("anchorChanged", function (currentAnchor) {
                this.fire("anchorChanged", {endpoint: this, anchor: currentAnchor});
                _updateAnchorClass();
            }.bind(this));
            return a;
        };

        this.setPreparedAnchor = function(anchor, doNotRepaint) {
            this._coreTopology.instance.continuousAnchorFactory.clear(this.elementId);
            this.anchor = anchor;
            _updateAnchorClass();

            if (!doNotRepaint)
                this._coreTopology.instance.repaint(this.elementId);

            return this;
        };

        this.setAnchor = function (anchorParams, doNotRepaint) {
            var a = this.prepareAnchor(anchorParams);
            this.setPreparedAnchor(a, doNotRepaint);
            return this;
        };

        var internalHover = function (state) {
            if (this.connections.length > 0) {
                for (var i = 0; i < this.connections.length; i++)
                    this.connections[i].setHover(state, false);
            }
            else
                this.setHover(state);
        }.bind(this);

        this.bind("mouseover", function () {
            internalHover(true);
        });
        this.bind("mouseout", function () {
            internalHover(false);
        });

        // ANCHOR MANAGER
        if (!params._transient) // in place copies, for example, are transient.  they will never need to be retrieved during a paint cycle, because they dont move, and then they are deleted.
            this._coreTopology.instance.anchorManager.add(this, this.elementId);

        this.prepareEndpoint = function(ep, typeId) {
            var _e = function (t, p) {
                var rm = _coreTopology.getRenderMode();
                if (_jp.Endpoints[rm][t]) return new _jp.Endpoints[rm][t](p);
                if (!_coreTopology.Defaults.DoNotThrowErrors)
                    throw { msg: "coreTopology: unknown endpoint type '" + t + "'" };
            };

            var endpointArgs = {
                _coreTopology: this._coreTopology.instance,
                cssClass: params.cssClass,
                container: params.container,
                tooltip: params.tooltip,
                connectorTooltip: params.connectorTooltip,
                endpoint: this
            };

            var endpoint;

            if (_ju.isString(ep))
                endpoint = _e(ep, endpointArgs);
            else if (_ju.isArray(ep)) {
                endpointArgs = _ju.merge(ep[1], endpointArgs);
                endpoint = _e(ep[0], endpointArgs);
            }
            else {
                endpoint = ep.clone();
            }

            // assign a clone function using a copy of endpointArgs. this is used when a drag starts: the endpoint that was dragged is cloned,
            // and the clone is left in its place while the original one goes off on a magical journey.
            // the copy is to get around a closure problem, in which endpointArgs ends up getting shared by
            // the whole world.
            //var argsForClone = coreTopology.extend({}, endpointArgs);
            endpoint.clone = function () {
                // TODO this, and the code above, can be refactored to be more dry.
                if (_ju.isString(ep))
                    return _e(ep, endpointArgs);
                else if (_ju.isArray(ep)) {
                    endpointArgs = _ju.merge(ep[1], endpointArgs);
                    return _e(ep[0], endpointArgs);
                }
            }.bind(this);

            endpoint.typeId = typeId;
            return endpoint;
        };

        this.setEndpoint = function(ep, doNotRepaint) {
            var _ep = this.prepareEndpoint(ep);
            this.setPreparedEndpoint(_ep, true);
        };

        this.setPreparedEndpoint = function (ep, doNotRepaint) {
            if (this.endpoint != null) {
                this.endpoint.cleanup();
                this.endpoint.destroy();
            }
            this.endpoint = ep;
            this.type = this.endpoint.type;
            this.canvas = this.endpoint.canvas;
        };

        _jp.extend(this, params, typeParameters);

        this.isSource = params.isSource || false;
        this.isTemporarySource = params.isTemporarySource || false;
        this.isTarget = params.isTarget || false;

        this.connections = params.connections || [];
        this.connectorPointerEvents = params["connector-pointer-events"];

        this.scope = params.scope || _coreTopology.getDefaultScope();
        this.timestamp = null;
        this.reattachConnections = params.reattach || _coreTopology.Defaults.ReattachConnections;
        this.connectionsDetachable = _coreTopology.Defaults.ConnectionsDetachable;
        if (params.connectionsDetachable === false || params.detachable === false)
            this.connectionsDetachable = false;
        this.dragAllowedWhenFull = params.dragAllowedWhenFull !== false;

        if (params.onMaxConnections)
            this.bind("maxConnections", params.onMaxConnections);

        //
        // add a connection. not part of public API.
        //
        this.addConnection = function (connection) {
            this.connections.push(connection);
            this[(this.connections.length > 0 ? "add" : "remove") + "Class"](_coreTopology.endpointConnectedClass);
            this[(this.isFull() ? "add" : "remove") + "Class"](_coreTopology.endpointFullClass);
        };

        this.detachFromConnection = function (connection, idx, doNotCleanup) {
            //idx = idx == null ? findConnectionIndex(connection, this) : idx;
            idx = idx == null ? this.connections.indexOf(connection) : idx;
            if (idx >= 0) {
                this.connections.splice(idx, 1);
                this[(this.connections.length > 0 ? "add" : "remove") + "Class"](_coreTopology.endpointConnectedClass);
                this[(this.isFull() ? "add" : "remove") + "Class"](_coreTopology.endpointFullClass);
            }

            if (!doNotCleanup && this._deleteOnDetach && this.connections.length === 0) {
                _coreTopology.deleteObject({
                    endpoint: this,
                    fireEvent: false,
                    deleteAttachedObjects: false
                });
            }
        };

        this.detach = function (connection, ignoreTarget, forceDetach, fireEvent, originalEvent, endpointBeingDeleted, connectionIndex) {

            var idx = connectionIndex == null ? this.connections.indexOf(connection) : connectionIndex,
                actuallyDetached = false;
            fireEvent = (fireEvent !== false);

            if (idx >= 0) {

                if (forceDetach || connection._forceDetach || (connection.isDetachable() && connection.isDetachAllowed(connection) && this.isDetachAllowed(connection) && _coreTopology.checkCondition("beforeDetach", connection, endpointBeingDeleted) )) {

                    _coreTopology.deleteObject({
                        connection: connection,
                        fireEvent: (!ignoreTarget && fireEvent),
                        originalEvent: originalEvent,
                        deleteAttachedObjects: false/**/
                    });
                    actuallyDetached = true;
                }
            }
            return actuallyDetached;
        };

        this.detachAll = function (fireEvent, forceDetach) {
            var unaffectedConns = [];
            while (this.connections.length > 0) {
                // TODO this could pass the index in to the detach method to save some time (index will always be zero in this while loop)
                var actuallyDetached = this.detach(this.connections[0], false, forceDetach === true, fireEvent !== false, null, this, 0);
                if (!actuallyDetached) {
                    unaffectedConns.push(this.connections[0]);
                    this.connections.splice(0, 1);
                }
            }
            this.connections = unaffectedConns;
            return this;
        };
        this.detachFrom = function (targetEndpoint, fireEvent, originalEvent) {
            var c = [];
            for (var i = 0; i < this.connections.length; i++) {
                if (this.connections[i].endpoints[1] == targetEndpoint || this.connections[i].endpoints[0] == targetEndpoint) {
                    c.push(this.connections[i]);
                }
            }
            for (var j = 0; j < c.length; j++) {
                this.detach(c[j], false, true, fireEvent, originalEvent);
            }
            return this;
        };

        this.getElement = function () {
            return this.element;
        };

        this.setElement = function (el) {
            var parentId = this._coreTopology.instance.getId(el),
                curId = this.elementId;
            // remove the endpoint from the list for the current endpoint's element
            _ju.removeWithFunction(params.endpointsByElement[this.elementId], function (e) {
                return e.id == this.id;
            }.bind(this));
            this.element = coreTopology.getElement(el);
            this.elementId = _coreTopology.getId(this.element);
            _coreTopology.anchorManager.rehomeEndpoint(this, curId, this.element);
            _coreTopology.dragManager.endpointAdded(this.element);
            _ju.addToList(params.endpointsByElement, parentId, this);
            return this;
        };

        /**
         * private but must be exposed.
         */
        this.makeInPlaceCopy = function () {
            var loc = this.anchor.getCurrentLocation({element: this}),
                o = this.anchor.getOrientation(this),
                acc = this.anchor.getCssClass(),
                inPlaceAnchor = {
                    bind: function () {
                    },
                    compute: function () {
                        return [ loc[0], loc[1] ];
                    },
                    getCurrentLocation: function () {
                        return [ loc[0], loc[1] ];
                    },
                    getOrientation: function () {
                        return o;
                    },
                    getCssClass: function () {
                        return acc;
                    }
                };

            return _newEndpoint({
                dropOptions: params.dropOptions,
                anchor: inPlaceAnchor,
                source: this.element,
                paintStyle: this.getPaintStyle(),
                endpoint: params.hideOnDrag ? "Blank" : this.endpoint,
                _transient: true,
                scope: this.scope,
                reference:this
            });
        };

        /**
         * returns a connection from the pool; used when dragging starts.  just gets the head of the array if it can.
         */
        this.connectorSelector = function () {
            var candidate = this.connections[0];
            // SP target source refactor
            if (/*this.isTarget && */candidate) return candidate;
            else {
                return (this.connections.length < this._coreTopology.maxConnections) || this._coreTopology.maxConnections == -1 ? null : candidate;
            }
        };

        this.setStyle = this.setPaintStyle;

        this.paint = function (params) {
            params = params || {};
            var timestamp = params.timestamp, recalc = !(params.recalc === false);
            if (!timestamp || this.timestamp !== timestamp) {

                var info = _coreTopology.updateOffset({ elId: this.elementId, timestamp: timestamp });

                var xy = params.offset ? params.offset.o : info.o;
                if (xy != null) {
                    var ap = params.anchorPoint, connectorPaintStyle = params.connectorPaintStyle;
                    if (ap == null) {
                        var wh = params.dimensions || info.s,
                            anchorParams = { xy: [ xy.left, xy.top ], wh: wh, element: this, timestamp: timestamp };
                        if (recalc && this.anchor.isDynamic && this.connections.length > 0) {
                            var c = findConnectionToUseForDynamicAnchor(this, params.elementWithPrecedence),
                                oIdx = c.endpoints[0] == this ? 1 : 0,
                                oId = oIdx === 0 ? c.sourceId : c.targetId,
                                oInfo = _coreTopology.getCachedData(oId),
                                oOffset = oInfo.o, oWH = oInfo.s;
                            anchorParams.txy = [ oOffset.left, oOffset.top ];
                            anchorParams.twh = oWH;
                            anchorParams.tElement = c.endpoints[oIdx];
                        }
                        ap = this.anchor.compute(anchorParams);
                    }

                    this.endpoint.compute(ap, this.anchor.getOrientation(this), this._coreTopology.paintStyleInUse, connectorPaintStyle || this.paintStyleInUse);
                    this.endpoint.paint(this._coreTopology.paintStyleInUse, this.anchor);
                    this.timestamp = timestamp;

                    // paint overlays
                    for (var i in this._coreTopology.overlays) {
                        if (this._coreTopology.overlays.hasOwnProperty(i)) {
                            var o = this._coreTopology.overlays[i];
                            if (o.isVisible()) {
                                this._coreTopology.overlayPlacements[i] = o.draw(this.endpoint, this._coreTopology.paintStyleInUse);
                                o.paint(this._coreTopology.overlayPlacements[i]);
                            }
                        }
                    }
                }
            }
        };

        this.getTypeDescriptor = function () {
            return "endpoint";
        };
        this.isVisible = function () {
            return this._coreTopology.visible;
        };

        this.repaint = this.paint;

        var draggingInitialised = false;
        this.initDraggable = function () {

            // is this a connection source? we make it draggable and have the
            // drag listener maintain a connection with a floating endpoint.
            if (!draggingInitialised && _jp.isDragSupported(this.element)) {
                var placeholderInfo = { id: null, element: null },
                    jpc = null,
                    existingJpc = false,
                    existingJpcParams = null,
                    _dragHandler = _makeConnectionDragHandler(this, placeholderInfo, _coreTopology),
                    dragOptions = params.dragOptions || {},
                    defaultOpts = {},
                    startEvent = _jp.dragEvents.start,
                    stopEvent = _jp.dragEvents.stop,
                    dragEvent = _jp.dragEvents.drag,
                    beforeStartEvent = _jp.dragEvents.beforeStart,
                    payload;

                // respond to beforeStart from katavorio; this will have, optionally, a payload of attribute values
                // that were placed there by the makeSource mousedown listener.
                var beforeStart = function(beforeStartParams) {
                    payload = beforeStartParams.e.payload || {};
                };

                var start = function (startParams) {

// -------------   first, get a connection to drag. this may be null, in which case we are dragging a new one.

                    jpc = this.connectorSelector();

// -------------------------------- now a bunch of tests about whether or not to proceed -------------------------

                    var _continue = true;
                    // if not enabled, return
                    if (!this.isEnabled()) _continue = false;
                    // if no connection and we're not a source - or temporarily a source, as is the case with makeSource - return.
                    if (jpc == null && !this.isSource && !this.isTemporarySource) _continue = false;
                    // otherwise if we're full and not allowed to drag, also return false.
                    if (this.isSource && this.isFull() && !(jpc != null && this.dragAllowedWhenFull)) _continue = false;
                    // if the connection was setup as not detachable or one of its endpoints
                    // was setup as connectionsDetachable = false, or Defaults.ConnectionsDetachable
                    // is set to false...
                    if (jpc != null && !jpc.isDetachable(this)) _continue = false;

                    var beforeDrag = _coreTopology.checkCondition(jpc == null ? "beforeDrag" : "beforeStartDetach", {
                        endpoint:this,
                        source:this.element,
                        sourceId:this.elementId,
                        connection:jpc
                    });
                    if (beforeDrag === false) _continue = false;
                    // else we might have been given some data. we'll pass it in to a new connection as 'data'.
                    // here we also merge in the optional payload we were given on mousedown.
                    else if (typeof beforeDrag === "object") {
                        coreTopology.extend(beforeDrag, payload || {});
                    }
                    else
                        // or if no beforeDrag data, maybe use the payload on its own.
                        beforeDrag = payload || {};

                    if (_continue === false) {
                        // this is for mootools and yui. returning false from this causes jquery to stop drag.
                        // the events are wrapped in both mootools and yui anyway, but i don't think returning
                        // false from the start callback would stop a drag.
                        if (_coreTopology.stopDrag) _coreTopology.stopDrag(this.canvas);
                        _dragHandler.stopDrag();
                        return false;
                    }

// ---------------------------------------------------------------------------------------------------------------------

                    // ok to proceed.

                    // clear hover for all connections for this endpoint before continuing.
                    for (var i = 0; i < this.connections.length; i++)
                        this.connections[i].setHover(false);

                    this.addClass("endpointDrag");
                    _coreTopology.setConnectionBeingDragged(true);

                    // if we're not full but there was a connection, make it null. we'll create a new one.
                    if (jpc && !this.isFull() && this.isSource) jpc = null;

                    _coreTopology.updateOffset({ elId: this.elementId });

// ----------------    make the element we will drag around, and position it -----------------------------

                    var ipco = this._coreTopology.instance.getOffset(this.canvas),
                        canvasElement = this.canvas,
                        ips = this._coreTopology.instance.getSize(this.canvas);

                    _makeDraggablePlaceholder(placeholderInfo, _coreTopology, ipco, ips);

                    // store the id of the dragging div and the source element. the drop function will pick these up.                   
                    _coreTopology.setAttributes(this.canvas, {
                        "dragId": placeholderInfo.id,
                        "elId": this.elementId
                    });

// ------------------- create an endpoint that will be our floating endpoint ------------------------------------

                    var endpointToFloat = this.dragProxy || this.endpoint;
                    if (this.dragProxy == null && this.connectionType != null) {
                        var aae = this._coreTopology.instance.deriveEndpointAndAnchorSpec(this.connectionType);
                        if (aae.endpoints[1]) endpointToFloat = aae.endpoints[1];
                    }
                    var centerAnchor = this._coreTopology.instance.makeAnchor("Center");
                    centerAnchor.isFloating = true;
                    this._coreTopology.floatingEndpoint = _makeFloatingEndpoint(this.getPaintStyle(), centerAnchor, endpointToFloat, this.canvas, placeholderInfo.element, _coreTopology, _newEndpoint, this.scope);
                    var _savedAnchor = this._coreTopology.floatingEndpoint.anchor;


                    if (jpc == null) {

                        this.setHover(false, false);
                        // create a connection. one end is this endpoint, the other is a floating endpoint.                    
                        jpc = _newConnection({
                            sourceEndpoint: this,
                            targetEndpoint: this._coreTopology.floatingEndpoint,
                            source: this.element,  // for makeSource with parent option.  ensure source element is represented correctly.
                            target: placeholderInfo.element,
                            anchors: [ this.anchor, this._coreTopology.floatingEndpoint.anchor ],
                            paintStyle: params.connectorStyle, // this can be null. Connection will use the default.
                            hoverPaintStyle: params.connectorHoverStyle,
                            connector: params.connector, // this can also be null. Connection will use the default.
                            overlays: params.connectorOverlays,
                            type: this.connectionType,
                            cssClass: this.connectorClass,
                            hoverClass: this.connectorHoverClass,
                            scope:params.scope,
                            data:beforeDrag
                        });
                        jpc.pending = true;
                        jpc.addClass(_coreTopology.draggingClass);
                        this._coreTopology.floatingEndpoint.addClass(_coreTopology.draggingClass);
                        this._coreTopology.floatingEndpoint.anchor = _savedAnchor;
                        // fire an event that informs that a connection is being dragged
                        _coreTopology.fire("connectionDrag", jpc);

                        // register the new connection on the drag manager. This connection, at this point, is 'pending',
                        // and has as its target a temporary element (the 'placeholder'). If the connection subsequently
                        // becomes established, the anchor manager is informed that the target of the connection has
                        // changed.

                        _coreTopology.anchorManager.newConnection(jpc);

                    } else {
                        existingJpc = true;
                        jpc.setHover(false);
                        // new anchor idx
                        var anchorIdx = jpc.endpoints[0].id == this.id ? 0 : 1;
                        this.detachFromConnection(jpc, null, true);                         // detach from the connection while dragging is occurring. but dont cleanup automatically.

                        // store the original scope (issue 57)
                        var dragScope = _coreTopology.getDragScope(canvasElement);
                        _coreTopology.setAttribute(this.canvas, "originalScope", dragScope);

                        // fire an event that informs that a connection is being dragged. we do this before
                        // replacing the original target with the floating element info.
                        _coreTopology.fire("connectionDrag", jpc);

                        // now we replace ourselves with the temporary div we created above:
                        if (anchorIdx === 0) {
                            existingJpcParams = [ jpc.source, jpc.sourceId, canvasElement, dragScope ];
                            jpc.source = placeholderInfo.element;
                            jpc.sourceId = placeholderInfo.id;

                            _coreTopology.anchorManager.sourceChanged(jpc.endpoints[anchorIdx].elementId, jpc.sourceId, jpc);

                        } else {
                            existingJpcParams = [ jpc.target, jpc.targetId, canvasElement, dragScope ];
                            jpc.target = placeholderInfo.element;
                            jpc.targetId = placeholderInfo.id;

                            _coreTopology.anchorManager.updateOtherEndpoint(jpc.sourceId, jpc.endpoints[anchorIdx].elementId, jpc.targetId, jpc);
                        }

                        // lock the other endpoint; if it is dynamic it will not move while the drag is occurring.
                        // TODO SP i commented this out as part of the rewirte; i think now we want the other endpoint
                        // to behave naturally.
                        // SJP
                        //jpc.endpoints[anchorIdx === 0 ? 1 : 0].anchor.locked = true;


                        // store the original endpoint and assign the new floating endpoint for the drag.
                        jpc.suspendedEndpoint = jpc.endpoints[anchorIdx];

                        // PROVIDE THE SUSPENDED ELEMENT, BE IT A SOURCE OR TARGET (ISSUE 39)
                        jpc.suspendedElement = jpc.endpoints[anchorIdx].getElement();
                        jpc.suspendedElementId = jpc.endpoints[anchorIdx].elementId;
                        jpc.suspendedElementType = anchorIdx === 0 ? "source" : "target";

                        jpc.suspendedEndpoint.setHover(false);
                        this._coreTopology.floatingEndpoint.referenceEndpoint = jpc.suspendedEndpoint;
                        jpc.endpoints[anchorIdx] = this._coreTopology.floatingEndpoint;

                        jpc.addClass(_coreTopology.draggingClass);
                        this._coreTopology.floatingEndpoint.addClass(_coreTopology.draggingClass);
                    }

                    // register it and register connection on it.
                    _coreTopology.floatingConnections[placeholderInfo.id] = jpc;
                    // only register for the target endpoint; we will not be dragging the source at any time
                    // before this connection is either discarded or made into a permanent connection.
                    _ju.addToList(params.endpointsByElement, placeholderInfo.id, this._coreTopology.floatingEndpoint);
                    // tell coretopology about it
                    _coreTopology.currentlyDragging = true;
                }.bind(this);

                var stop = function () {
                    _coreTopology.setConnectionBeingDragged(false);

                    if (jpc && jpc.endpoints != null) {
                        // get the actual drop event (decode from library args to stop function)
                        var originalEvent = _coreTopology.getDropEvent(arguments);
                        // unlock the other endpoint (if it is dynamic, it would have been locked at drag start)
                        var idx = _coreTopology.getFloatingAnchorIndex(jpc);
                        jpc.endpoints[idx === 0 ? 1 : 0].anchor.locked = false;
                        // TODO: Dont want to know about css classes inside coretopology, ideally.
                        jpc.removeClass(_coreTopology.draggingClass);

                        // if we have the floating endpoint then the connection has not been dropped
                        // on another endpoint.  If it is a new connection we throw it away. If it is an
                        // existing connection we check to see if we should reattach it, throwing it away
                        // if not.
                        if (this._coreTopology && (jpc.deleteConnectionNow || jpc.endpoints[idx] == this._coreTopology.floatingEndpoint)) {
                            // 6a. if the connection was an existing one...
                            if (existingJpc && jpc.suspendedEndpoint) {
                                // fix for issue35, thanks Sylvain Gizard: when firing the detach event make sure the
                                // floating endpoint has been replaced.
                                if (idx === 0) {
                                    jpc.floatingElement = jpc.source;
                                    jpc.floatingId = jpc.sourceId;
                                    jpc.floatingEndpoint = jpc.endpoints[0];
                                    jpc.floatingIndex = 0;
                                    jpc.source = existingJpcParams[0];
                                    jpc.sourceId = existingJpcParams[1];
                                } else {
                                    // keep a copy of the floating element; the anchor manager will want to clean up.
                                    jpc.floatingElement = jpc.target;
                                    jpc.floatingId = jpc.targetId;
                                    jpc.floatingEndpoint = jpc.endpoints[1];
                                    jpc.floatingIndex = 1;
                                    jpc.target = existingJpcParams[0];
                                    jpc.targetId = existingJpcParams[1];
                                }

                                var fe = this._coreTopology.floatingEndpoint; // store for later removal.
                                // restore the original scope (issue 57)
                                _coreTopology.setDragScope(existingJpcParams[2], existingJpcParams[3]);
                                jpc.endpoints[idx] = jpc.suspendedEndpoint;
                                // IF the connection should be reattached, or the other endpoint refuses detach, then
                                // reset the connection to its original state
                                if (jpc.isReattach() || jpc._forceReattach || jpc._forceDetach || !jpc.endpoints[idx === 0 ? 1 : 0].detach(jpc, false, false, true, originalEvent, true)) {
                                    jpc.setHover(false);
                                    jpc._forceDetach = null;
                                    jpc._forceReattach = null;
                                    this._coreTopology.floatingEndpoint.detachFromConnection(jpc);
                                    jpc.suspendedEndpoint.addConnection(jpc);

                                    // TODO this code is duplicated in lots of places...and there is nothing external
                                    // in the code; it all refers to the connection itself. we could add a
                                    // `checkSanity(connection)` method to anchorManager that did this.
                                    if (idx == 1) {
                                        _coreTopology.anchorManager.updateOtherEndpoint(jpc.sourceId, jpc.floatingId, jpc.targetId, jpc);
                                    }
                                    else {
                                        _coreTopology.anchorManager.sourceChanged(jpc.floatingId, jpc.sourceId, jpc);
                                    }

                                    _coreTopology.repaint(existingJpcParams[1]);
                                }
                                else {
                                    _coreTopology.deleteObject({endpoint: fe});
                                }
                            }
                        }

                        // makeTargets sets this flag, to tell us we have been replaced and should delete this object.
                        if (this.deleteAfterDragStop) {
                            _coreTopology.deleteObject({endpoint: this});
                        }
                        else {
                            if (this._coreTopology) {
                                 this.paint({recalc: false});
                            }
                        }

                        // although the connection is no longer valid, there are use cases where this is useful.
                        _coreTopology.fire("connectionDragStop", jpc, originalEvent);
                        // fire this event to give people more fine-grained control (connectionDragStop fires a lot)
                        if (jpc.pending) {
                            _coreTopology.fire("connectionAborted", jpc, originalEvent);
                        }
                        // tell coretopology that dragging is finished.
                        _coreTopology.currentlyDragging = false;
                        jpc = null;
                    }

                    // if no endpoints, jpc already cleaned up. but still we want to ensure we're reset properly.
                    // remove the element associated with the floating endpoint
                    // (and its associated floating endpoint and visual artefacts)
                    if (placeholderInfo && placeholderInfo.element) {
                        _coreTopology.remove(placeholderInfo.element, false, false);
                    }
                    // remove the inplace copy
                    if (inPlaceCopy) {
                        _coreTopology.deleteObject({endpoint: inPlaceCopy});
                    }

                    if (this._coreTopology) {
                        // make our canvas visible (TODO: hand off to library; we should not know about DOM)
                        this.canvas.style.visibility = "visible";
                        // unlock our anchor
                        this.anchor.locked = false;
                        // clear floating anchor.
                        this._coreTopology.floatingEndpoint = null;
                    }

                }.bind(this);

                dragOptions = _jp.extend(defaultOpts, dragOptions);
                dragOptions.scope = this.scope || dragOptions.scope;
                dragOptions[beforeStartEvent] = _ju.wrap(dragOptions[beforeStartEvent], beforeStart, false);
                dragOptions[startEvent] = _ju.wrap(dragOptions[startEvent], start, false);
                // extracted drag handler function so can be used by makeSource
                dragOptions[dragEvent] = _ju.wrap(dragOptions[dragEvent], _dragHandler.drag);
                dragOptions[stopEvent] = _ju.wrap(dragOptions[stopEvent], stop);
                dragOptions.multipleDrop = false;

                dragOptions.canDrag = function () {
                    return this.isSource || this.isTemporarySource || /*(this.isTarget && */this.connections.length > 0/*)*/;
                }.bind(this);

                _coreTopology.initDraggable(this.canvas, dragOptions, "internal");

                this.canvas._coreTopologyRelatedElement = this.element;

                draggingInitialised = true;
            }
        };

        var ep = params.endpoint || this._coreTopology.instance.Defaults.Endpoint || _jp.Defaults.Endpoint;
        this.setEndpoint(ep, true);
        var anchorParamsToUse = params.anchor ? params.anchor : params.anchors ? params.anchors : (_coreTopology.Defaults.Anchor || "Top");
        this.setAnchor(anchorParamsToUse, true);

        // finally, set type if it was provided
        var type = [ "default", (params.type || "")].join(" ");
        this.addType(type, params.data, true);
        this.canvas = this.endpoint.canvas;
        this.canvas._coreTopology = this;

        this.initDraggable();

        // pulled this out into a function so we can reuse it for the inPlaceCopy canvas; you can now drop detached connections
        // back onto the endpoint you detached it from.
        var _initDropTarget = function (canvas, isTransient, endpoint, referenceEndpoint) {

            if (_jp.isDropSupported(this.element)) {
                var dropOptions = params.dropOptions || _coreTopology.Defaults.DropOptions || _jp.Defaults.DropOptions;
                dropOptions = _jp.extend({}, dropOptions);
                dropOptions.scope = dropOptions.scope || this.scope;
                var dropEvent = _jp.dragEvents.drop,
                    overEvent = _jp.dragEvents.over,
                    outEvent = _jp.dragEvents.out,
                    _ep = this,
                    drop = _coreTopology.EndpointDropHandler({
                        getEndpoint: function () {
                            return _ep;
                        },
                        coreTopology: _coreTopology,
                        enabled: function () {
                            return endpoint != null ? endpoint.isEnabled() : true;
                        },
                        isFull: function () {
                            return endpoint.isFull();
                        },
                        element: this.element,
                        elementId: this.elementId,
                        isSource: this.isSource,
                        isTarget: this.isTarget,
                        addClass: function (clazz) {
                            _ep.addClass(clazz);
                        },
                        removeClass: function (clazz) {
                            _ep.removeClass(clazz);
                        },
                        isDropAllowed: function () {
                            return _ep.isDropAllowed.apply(_ep, arguments);
                        },
                        reference:referenceEndpoint,
                        isRedrop:function(jpc, dhParams) {
                            return jpc.suspendedEndpoint && dhParams.reference && (jpc.suspendedEndpoint.id === dhParams.reference.id);
                        }
                    });

                dropOptions[dropEvent] = _ju.wrap(dropOptions[dropEvent], drop, true);
                dropOptions[overEvent] = _ju.wrap(dropOptions[overEvent], function () {
                    var draggable = _jp.getDragObject(arguments),
                        id = _coreTopology.getAttribute(_jp.getElement(draggable), "dragId"),
                        _jpc = _coreTopology.floatingConnections[id];

                    if (_jpc != null) {
                        var idx = _coreTopology.getFloatingAnchorIndex(_jpc);
                        // here we should fire the 'over' event if we are a target and this is a new connection,
                        // or we are the same as the floating endpoint.
                        var _cont = (this.isTarget && idx !== 0) || (_jpc.suspendedEndpoint && this.referenceEndpoint && this.referenceEndpoint.id == _jpc.suspendedEndpoint.id);
                        if (_cont) {
                            var bb = _coreTopology.checkCondition("checkDropAllowed", {
                                sourceEndpoint: _jpc.endpoints[idx],
                                targetEndpoint: this,
                                connection: _jpc
                            });
                            this[(bb ? "add" : "remove") + "Class"](_coreTopology.endpointDropAllowedClass);
                            this[(bb ? "remove" : "add") + "Class"](_coreTopology.endpointDropForbiddenClass);
                            _jpc.endpoints[idx].anchor.over(this.anchor, this);
                        }
                    }
                }.bind(this));

                dropOptions[outEvent] = _ju.wrap(dropOptions[outEvent], function () {
                    var draggable = _jp.getDragObject(arguments),
                        id = draggable == null ? null : _coreTopology.getAttribute(_jp.getElement(draggable), "dragId"),
                        _jpc = id ? _coreTopology.floatingConnections[id] : null;

                    if (_jpc != null) {
                        var idx = _coreTopology.getFloatingAnchorIndex(_jpc);
                        var _cont = (this.isTarget && idx !== 0) || (_jpc.suspendedEndpoint && this.referenceEndpoint && this.referenceEndpoint.id == _jpc.suspendedEndpoint.id);
                        if (_cont) {
                            this.removeClass(_coreTopology.endpointDropAllowedClass);
                            this.removeClass(_coreTopology.endpointDropForbiddenClass);
                            _jpc.endpoints[idx].anchor.out();
                        }
                    }
                }.bind(this));

                _coreTopology.initDroppable(canvas, dropOptions, "internal", isTransient);
            }
        }.bind(this);

        // Initialise the endpoint's canvas as a drop target. The drop handler will take care of the logic of whether
        // something can actually be dropped.
        if (!this.anchor.isFloating)
            _initDropTarget(this.canvas, !(params._transient || this.anchor.isFloating), this, params.reference);


        return this;
    };

    _ju.extend(_jp.Endpoint, _jp.OverlayCapableJsPlumbUIComponent, {

        setVisible: function (v, doNotChangeConnections, doNotNotifyOtherEndpoint) {
            this._coreTopology.visible = v;
            if (this.canvas) this.canvas.style.display = v ? "block" : "none";
            this[v ? "showOverlays" : "hideOverlays"]();
            if (!doNotChangeConnections) {
                for (var i = 0; i < this.connections.length; i++) {
                    this.connections[i].setVisible(v);
                    if (!doNotNotifyOtherEndpoint) {
                        var oIdx = this === this.connections[i].endpoints[0] ? 1 : 0;
                        // only change the other endpoint if this is its only connection.
                        if (this.connections[i].endpoints[oIdx].connections.length == 1) this.connections[i].endpoints[oIdx].setVisible(v, true, true);
                    }
                }
            }
        },
        getAttachedElements: function () {
            return this.connections;
        },
        applyType: function (t, doNotRepaint) {
            this.setPaintStyle(t.endpointStyle || t.paintStyle, doNotRepaint);
            this.setHoverPaintStyle(t.endpointHoverStyle || t.hoverPaintStyle, doNotRepaint);
            if (t.maxConnections != null) this._coreTopology.maxConnections = t.maxConnections;
            if (t.scope) this.scope = t.scope;
            _jp.extend(this, t, typeParameters);
            if (t.cssClass != null && this.canvas) this._coreTopology.instance.addClass(this.canvas, t.cssClass);
            _jp.OverlayCapableJsPlumbUIComponent.applyType(this, t);
        },
        isEnabled: function () {
            return this._coreTopology.enabled;
        },
        setEnabled: function (e) {
            this._coreTopology.enabled = e;
        },
        cleanup: function () {
            var anchorClass = this._coreTopology.instance.endpointAnchorClassPrefix + (this._coreTopology.currentAnchorClass ? "-" + this._coreTopology.currentAnchorClass : "");
            coreTopology.removeClass(this.element, anchorClass);
            this.anchor = null;
            this.endpoint.cleanup(true);
            this.endpoint.destroy();
            this.endpoint = null;
            // drag/drop
            this._coreTopology.instance.destroyDraggable(this.canvas, "internal");
            this._coreTopology.instance.destroyDroppable(this.canvas, "internal");
        },
        setHover: function (h) {
            if (this.endpoint && this._coreTopology && !this._coreTopology.instance.isConnectionBeingDragged())
                this.endpoint.setHover(h);
        },
        isFull: function () {
            return this._coreTopology.maxConnections === 0 ? true : !(this.isFloating() || this._coreTopology.maxConnections < 0 || this.connections.length < this._coreTopology.maxConnections);
        },
        /**
         * private but needs to be exposed.
         */
        isFloating: function () {
            return this.anchor != null && this.anchor.isFloating;
        },
        isConnectedTo: function (endpoint) {
            var found = false;
            if (endpoint) {
                for (var i = 0; i < this.connections.length; i++) {
                    if (this.connections[i].endpoints[1] == endpoint || this.connections[i].endpoints[0] == endpoint) {
                        found = true;
                        break;
                    }
                }
            }
            return found;
        },
        getConnectionCost: function () {
            return this._coreTopology.connectionCost;
        },
        setConnectionCost: function (c) {
            this._coreTopology.connectionCost = c;
        },
        areConnectionsDirected: function () {
            return this._coreTopology.connectionsDirected;
        },
        setConnectionsDirected: function (b) {
            this._coreTopology.connectionsDirected = b;
        },
        setElementId: function (_elId) {
            this.elementId = _elId;
            this.anchor.elementId = _elId;
        },
        setReferenceElement: function (_el) {
            this.element = _jp.getElement(_el);
        },
        setDragAllowedWhenFull: function (allowed) {
            this.dragAllowedWhenFull = allowed;
        },
        equals: function (endpoint) {
            return this.anchor.equals(endpoint.anchor);
        },
        getUuid: function () {
            return this._coreTopology.uuid;
        },
        computeAnchor: function (params) {
            return this.anchor.compute(params);
        }
    });

    root.coreTopologyInstance.prototype.EndpointDropHandler = function (dhParams) {
        return function (e) {

            var _coreTopology = dhParams.coreTopology;

            // remove the classes that are added dynamically. drop is neither forbidden nor allowed now that
            // the drop is finishing.
            dhParams.removeClass(_coreTopology.endpointDropAllowedClass);
            dhParams.removeClass(_coreTopology.endpointDropForbiddenClass);

            var originalEvent = _coreTopology.getDropEvent(arguments),
                draggable = _coreTopology.getDragObject(arguments),
                id = _coreTopology.getAttribute(draggable, "dragId"),
                elId = _coreTopology.getAttribute(draggable, "elId"),
                scope = _coreTopology.getAttribute(draggable, "originalScope"),
                jpc = _coreTopology.floatingConnections[id];

            // if no active connection, bail.
            if (jpc == null) return;

            // calculate if this is an existing connection.
            var existingConnection = jpc.suspendedEndpoint != null;

            // if suspended endpoint exists but has been cleaned up, bail. This means it's an existing connection
            // that has been detached and will shortly be discarded.
            if (existingConnection && jpc.suspendedEndpoint._coreTopology == null) return;

            // get the drop endpoint. for a normal connection this is just the one that would replace the currently
            // floating endpoint. for a makeTarget this is a new endpoint that is created on drop. But we leave that to
            // the handler to figure out.
            var _ep = dhParams.getEndpoint(jpc);

            // If we're not given an endpoint to use, bail.
            if (_ep == null) return;

            // if this is a drop back where the connection came from, mark it force reattach and
            // return; the stop handler will reattach. without firing an event.
            if (dhParams.isRedrop(jpc, dhParams)) {
                jpc._forceReattach = true;
                jpc.setHover(false);
                if (dhParams.maybeCleanup) dhParams.maybeCleanup(_ep);
                return;
            }

            // ensure we dont bother trying to drop sources on non-source eps, and same for target.
            var idx = _coreTopology.getFloatingAnchorIndex(jpc);
            if ((idx === 0 && !dhParams.isSource)|| (idx === 1 && !dhParams.isTarget)){
                if (dhParams.maybeCleanup) dhParams.maybeCleanup(_ep);
                return;
            }

            if (dhParams.onDrop) dhParams.onDrop(jpc);

            // restore the original scope if necessary (issue 57)
            if (scope) _coreTopology.setDragScope(draggable, scope);

            // if the target of the drop is full, fire an event (we abort below)
            // makeTarget: keep.
            var isFull = dhParams.isFull(e);
            if (isFull) {
                _ep.fire("maxConnections", {
                    endpoint: this,
                    connection: jpc,
                    maxConnections: _ep._coreTopology.maxConnections
                }, originalEvent);
            }
            //
            // if endpoint enabled, not full, and matches the index of the floating endpoint...
            if (!isFull &&  dhParams.enabled()) {
                var _doContinue = true;

                // before testing for beforeDrop, reset the connection's source/target to be the actual DOM elements
                // involved (that is, stash any temporary stuff used for dragging. but we need to keep it around in
                // order that the anchor manager can clean things up properly).
                if (idx === 0) {
                    jpc.floatingElement = jpc.source;
                    jpc.floatingId = jpc.sourceId;
                    jpc.floatingEndpoint = jpc.endpoints[0];
                    jpc.floatingIndex = 0;
                    jpc.source = dhParams.element;
                    jpc.sourceId = dhParams.elementId;
                } else {
                    jpc.floatingElement = jpc.target;
                    jpc.floatingId = jpc.targetId;
                    jpc.floatingEndpoint = jpc.endpoints[1];
                    jpc.floatingIndex = 1;
                    jpc.target = dhParams.element;
                    jpc.targetId = dhParams.elementId;
                }

                // if this is an existing connection and detach is not allowed we won't continue. The connection's
                // endpoints have been reinstated; everything is back to how it was.
                if (existingConnection && jpc.suspendedEndpoint.id != _ep.id) {

                    if (!jpc.isDetachAllowed(jpc) || !jpc.endpoints[idx].isDetachAllowed(jpc) || !jpc.suspendedEndpoint.isDetachAllowed(jpc) || !_coreTopology.checkCondition("beforeDetach", jpc))
                        _doContinue = false;
                }

// ------------ wrap the execution path in a function so we can support asynchronous beforeDrop

                var continueFunction = function (optionalData) {
                    // remove this jpc from the current endpoint, which is a floating endpoint that we will
                    // subsequently discard.
                    jpc.endpoints[idx].detachFromConnection(jpc);

                    // if there's a suspended endpoint, detach it from the connection.
                    if (jpc.suspendedEndpoint) jpc.suspendedEndpoint.detachFromConnection(jpc);

                    jpc.endpoints[idx] = _ep;
                    _ep.addConnection(jpc);

                    // copy our parameters in to the connection:
                    var params = _ep.getParameters();
                    for (var aParam in params)
                        jpc.setParameter(aParam, params[aParam]);

                    if (!existingConnection) {
                        // if not an existing connection and
                        if (params.draggable)
                            _coreTopology.initDraggable(this.element, dragOptions, "internal", _coreTopology);
                    }
                    else {
                        var suspendedElementId = jpc.suspendedEndpoint.elementId;
                        _coreTopology.fireMoveEvent({
                            index: idx,
                            originalSourceId: idx === 0 ? suspendedElementId : jpc.sourceId,
                            newSourceId: idx === 0 ? _ep.elementId : jpc.sourceId,
                            originalTargetId: idx == 1 ? suspendedElementId : jpc.targetId,
                            newTargetId: idx == 1 ? _ep.elementId : jpc.targetId,
                            originalSourceEndpoint: idx === 0 ? jpc.suspendedEndpoint : jpc.endpoints[0],
                            newSourceEndpoint: idx === 0 ? _ep : jpc.endpoints[0],
                            originalTargetEndpoint: idx == 1 ? jpc.suspendedEndpoint : jpc.endpoints[1],
                            newTargetEndpoint: idx == 1 ? _ep : jpc.endpoints[1],
                            connection: jpc
                        }, originalEvent);
                    }

                    if (idx == 1) {
                        _coreTopology.anchorManager.updateOtherEndpoint(jpc.sourceId, jpc.floatingId, jpc.targetId, jpc);
                    }
                    else {
                        _coreTopology.anchorManager.sourceChanged(jpc.floatingId, jpc.sourceId, jpc);
                    }

                    // when makeSource has uniqueEndpoint:true, we want to create connections with new endpoints
                    // that are subsequently deleted. So makeSource sets `finalEndpoint`, which is the Endpoint to
                    // which the connection should be attached. The `detachFromConnection` call below results in the
                    // temporary endpoint being cleaned up.
                    if (jpc.endpoints[0].finalEndpoint) {
                        var _toDelete = jpc.endpoints[0];
                        _toDelete.detachFromConnection(jpc);
                        jpc.endpoints[0] = jpc.endpoints[0].finalEndpoint;
                        jpc.endpoints[0].addConnection(jpc);
                    }

                    // if optionalData was given, merge it onto the connection's data.
                    if (coreTopologyUtil.isObject(optionalData)) {
                        jpc.mergeData(optionalData);
                    }
                    // finalise will inform the anchor manager and also add to
                    // connectionsByScope if necessary.
                    _coreTopology.finaliseConnection(jpc, null, originalEvent, false);
                    jpc.setHover(false);

                }.bind(this);

                var dontContinueFunction = function () {
                    // otherwise just put it back on the endpoint it was on before the drag.
                    if (jpc.suspendedEndpoint) {
                        jpc.endpoints[idx] = jpc.suspendedEndpoint;
                        jpc.setHover(false);
                        jpc._forceDetach = true;
                        if (idx === 0) {
                            jpc.source = jpc.suspendedEndpoint.element;
                            jpc.sourceId = jpc.suspendedEndpoint.elementId;
                        } else {
                            jpc.target = jpc.suspendedEndpoint.element;
                            jpc.targetId = jpc.suspendedEndpoint.elementId;
                        }
                        jpc.suspendedEndpoint.addConnection(jpc);

                        // TODO checkSanity
                        if (idx == 1) {
                            _coreTopology.anchorManager.updateOtherEndpoint(jpc.sourceId, jpc.floatingId, jpc.targetId, jpc);
                        }
                        else {
                            _coreTopology.anchorManager.sourceChanged(jpc.floatingId, jpc.sourceId, jpc);
                        }

                        _coreTopology.repaint(jpc.sourceId);
                        jpc._forceDetach = false;
                    }
                };

// --------------------------------------
                // now check beforeDrop.  this will be available only on Endpoints that are setup to
                // have a beforeDrop condition (although, secretly, under the hood all Endpoints and
                // the Connection have them, because they are on coreTopologyUIComponent.  shhh!), because
                // it only makes sense to have it on a target endpoint.
                _doContinue = _doContinue && dhParams.isDropAllowed(jpc.sourceId, jpc.targetId, jpc.scope, jpc, _ep);// && jpc.pending;

                if (_doContinue) {
                    continueFunction(_doContinue);
                    return true;
                }
                else {
                    dontContinueFunction();
                }
            }

            if (dhParams.maybeCleanup) dhParams.maybeCleanup(_ep);

            _coreTopology.currentlyDragging = false;
        };
    };
}).call(window);
