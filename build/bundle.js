
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.47.0' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const notes = ['A','B','C','D','E','F','G'];

    function generateNote(){
        let newClef = (Math.random()>0.5 ? 'base' : 'treble');
        let newClefCenterOffset = Math.round((Math.random()-0.5) * 16);
        let newNote = notes[(notes.length + (((newClef == 'base' ? 3 : 1 ) - newClefCenterOffset)%notes.length))%notes.length];
        return {
            clef: newClef,
            clefCenterOffset: newClefCenterOffset,
            name: newNote
        }    
    }

    function setNote(){
        const note = writable( {});

        return { 
            subscribe: note.subscribe,
            new: () => note.set(generateNote()),
            clear: () => note.set({})
        }
    }


    var note = setNote();
    /*
    export const note = writable(
        {
            clef: newClef,
            clefCenterOffset: newClefCenterOffset,
            name: newNote
        }
    )
    */

    /* src/Note.svelte generated by Svelte v3.47.0 */
    const file$6 = "src/Note.svelte";

    function create_fragment$6(ctx) {
    	let g;
    	let circle;
    	let line;
    	let line_y__value;

    	const block = {
    		c: function create() {
    			g = svg_element("g");
    			circle = svg_element("circle");
    			line = svg_element("line");
    			attr_dev(circle, "class", "notehead");
    			attr_dev(circle, "fill", "black");
    			attr_dev(circle, "r", "6");
    			attr_dev(circle, "cx", "0");
    			attr_dev(circle, "cy", "0");
    			set_style(circle, "transform", "translate(0px, " + /*clefCenterOffset*/ ctx[1] * /*lineSpacing*/ ctx[0] / 2 + "px) skew(-15deg, 0deg)");
    			add_location(circle, file$6, 22, 4, 569);
    			attr_dev(line, "x1", "0");
    			attr_dev(line, "x2", "0");
    			attr_dev(line, "y1", "0");
    			attr_dev(line, "y2", line_y__value = 2.3 * /*lineSpacing*/ ctx[0] * /*stemDirection*/ ctx[2]);
    			attr_dev(line, "stroke", "black");
    			set_style(line, "transform", "translate(" + -/*stemDirection*/ ctx[2] * /*lineSpacing*/ ctx[0] / 2 + "px, " + /*clefCenterOffset*/ ctx[1] * /*lineSpacing*/ ctx[0] / 2 + "px)");
    			add_location(line, file$6, 25, 4, 742);
    			attr_dev(g, "id", "note");
    			set_style(g, "transform", "translate(" + /*transformX*/ ctx[3] + ", " + /*transformY*/ ctx[4] + ")");
    			add_location(g, file$6, 21, 0, 493);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, g, anchor);
    			append_dev(g, circle);
    			append_dev(g, line);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*clefCenterOffset, lineSpacing*/ 3) {
    				set_style(circle, "transform", "translate(0px, " + /*clefCenterOffset*/ ctx[1] * /*lineSpacing*/ ctx[0] / 2 + "px) skew(-15deg, 0deg)");
    			}

    			if (dirty & /*lineSpacing, stemDirection*/ 5 && line_y__value !== (line_y__value = 2.3 * /*lineSpacing*/ ctx[0] * /*stemDirection*/ ctx[2])) {
    				attr_dev(line, "y2", line_y__value);
    			}

    			if (dirty & /*stemDirection, lineSpacing, clefCenterOffset*/ 7) {
    				set_style(line, "transform", "translate(" + -/*stemDirection*/ ctx[2] * /*lineSpacing*/ ctx[0] / 2 + "px, " + /*clefCenterOffset*/ ctx[1] * /*lineSpacing*/ ctx[0] / 2 + "px)");
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(g);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Note', slots, []);
    	let { clefSvgHeight } = $$props;
    	let { lineSpacing } = $$props;
    	let clefCenterOffset, stemDirection;

    	const unsubscribe = note.subscribe(value => {
    		$$invalidate(1, clefCenterOffset = value.clefCenterOffset);
    		$$invalidate(2, stemDirection = clefCenterOffset < 0 ? 1 : -1);
    	});

    	onDestroy(unsubscribe);
    	const transformX = 100 + 'px';
    	const transformY = clefSvgHeight / 2 + 'px';
    	const writable_props = ['clefSvgHeight', 'lineSpacing'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Note> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('clefSvgHeight' in $$props) $$invalidate(5, clefSvgHeight = $$props.clefSvgHeight);
    		if ('lineSpacing' in $$props) $$invalidate(0, lineSpacing = $$props.lineSpacing);
    	};

    	$$self.$capture_state = () => ({
    		onDestroy,
    		note,
    		clefSvgHeight,
    		lineSpacing,
    		clefCenterOffset,
    		stemDirection,
    		unsubscribe,
    		transformX,
    		transformY
    	});

    	$$self.$inject_state = $$props => {
    		if ('clefSvgHeight' in $$props) $$invalidate(5, clefSvgHeight = $$props.clefSvgHeight);
    		if ('lineSpacing' in $$props) $$invalidate(0, lineSpacing = $$props.lineSpacing);
    		if ('clefCenterOffset' in $$props) $$invalidate(1, clefCenterOffset = $$props.clefCenterOffset);
    		if ('stemDirection' in $$props) $$invalidate(2, stemDirection = $$props.stemDirection);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		lineSpacing,
    		clefCenterOffset,
    		stemDirection,
    		transformX,
    		transformY,
    		clefSvgHeight
    	];
    }

    class Note extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { clefSvgHeight: 5, lineSpacing: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Note",
    			options,
    			id: create_fragment$6.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*clefSvgHeight*/ ctx[5] === undefined && !('clefSvgHeight' in props)) {
    			console.warn("<Note> was created without expected prop 'clefSvgHeight'");
    		}

    		if (/*lineSpacing*/ ctx[0] === undefined && !('lineSpacing' in props)) {
    			console.warn("<Note> was created without expected prop 'lineSpacing'");
    		}
    	}

    	get clefSvgHeight() {
    		throw new Error("<Note>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set clefSvgHeight(value) {
    		throw new Error("<Note>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get lineSpacing() {
    		throw new Error("<Note>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set lineSpacing(value) {
    		throw new Error("<Note>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Staff.svelte generated by Svelte v3.47.0 */
    const file$5 = "src/Staff.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	return child_ctx;
    }

    // (56:8) {#each staffLines as line}
    function create_each_block_1$1(ctx) {
    	let line;
    	let line_y__value;
    	let line_y__value_1;

    	const block = {
    		c: function create() {
    			line = svg_element("line");
    			attr_dev(line, "x1", "0");
    			attr_dev(line, "x2", "100%");
    			attr_dev(line, "y1", line_y__value = /*line*/ ctx[13] * /*lineSpacing*/ ctx[1]);
    			attr_dev(line, "y2", line_y__value_1 = /*line*/ ctx[13] * /*lineSpacing*/ ctx[1]);
    			attr_dev(line, "stroke", "black");
    			add_location(line, file$5, 56, 12, 1788);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, line, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*lineSpacing*/ 2 && line_y__value !== (line_y__value = /*line*/ ctx[13] * /*lineSpacing*/ ctx[1])) {
    				attr_dev(line, "y1", line_y__value);
    			}

    			if (dirty & /*lineSpacing*/ 2 && line_y__value_1 !== (line_y__value_1 = /*line*/ ctx[13] * /*lineSpacing*/ ctx[1])) {
    				attr_dev(line, "y2", line_y__value_1);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(line);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$1.name,
    		type: "each",
    		source: "(56:8) {#each staffLines as line}",
    		ctx
    	});

    	return block;
    }

    // (59:8) {#if noteData.clef == clef}
    function create_if_block_1$2(ctx) {
    	let each_1_anchor;
    	let each_value = /*ledgerLinesY*/ ctx[4];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*ledgerLinesY*/ 16) {
    				each_value = /*ledgerLinesY*/ ctx[4];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(59:8) {#if noteData.clef == clef}",
    		ctx
    	});

    	return block;
    }

    // (60:8) {#each ledgerLinesY as ledger}
    function create_each_block$1(ctx) {
    	let line;
    	let line_y__value;
    	let line_y__value_1;

    	const block = {
    		c: function create() {
    			line = svg_element("line");
    			attr_dev(line, "x1", "90");
    			attr_dev(line, "x2", "110");
    			attr_dev(line, "y1", line_y__value = /*ledger*/ ctx[10]);
    			attr_dev(line, "y2", line_y__value_1 = /*ledger*/ ctx[10]);
    			attr_dev(line, "stroke", "black");
    			add_location(line, file$5, 60, 12, 1972);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, line, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*ledgerLinesY*/ 16 && line_y__value !== (line_y__value = /*ledger*/ ctx[10])) {
    				attr_dev(line, "y1", line_y__value);
    			}

    			if (dirty & /*ledgerLinesY*/ 16 && line_y__value_1 !== (line_y__value_1 = /*ledger*/ ctx[10])) {
    				attr_dev(line, "y2", line_y__value_1);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(line);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(60:8) {#each ledgerLinesY as ledger}",
    		ctx
    	});

    	return block;
    }

    // (65:4) {#if noteData.clef == clef}
    function create_if_block$2(ctx) {
    	let note_1;
    	let current;

    	note_1 = new Note({
    			props: {
    				clefSvgHeight: /*clefSvgHeight*/ ctx[8],
    				lineSpacing: /*lineSpacing*/ ctx[1]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(note_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(note_1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const note_1_changes = {};
    			if (dirty & /*lineSpacing*/ 2) note_1_changes.lineSpacing = /*lineSpacing*/ ctx[1];
    			note_1.$set(note_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(note_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(note_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(note_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(65:4) {#if noteData.clef == clef}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let div;
    	let img;
    	let img_src_value;
    	let img_width_value;
    	let t;
    	let svg;
    	let g;
    	let each_1_anchor;
    	let current;
    	let each_value_1 = /*staffLines*/ ctx[7];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
    	}

    	let if_block0 = /*noteData*/ ctx[3].clef == /*clef*/ ctx[0] && create_if_block_1$2(ctx);
    	let if_block1 = /*noteData*/ ctx[3].clef == /*clef*/ ctx[0] && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			img = element("img");
    			t = space();
    			svg = svg_element("svg");
    			g = svg_element("g");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			if (if_block0) if_block0.c();
    			if (if_block1) if_block1.c();
    			attr_dev(img, "id", "clef");
    			if (!src_url_equal(img.src, img_src_value = "./clef-" + /*clef*/ ctx[0] + ".svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "width", img_width_value = "" + (/*clefWidth*/ ctx[5][/*clef*/ ctx[0]] + "px"));
    			set_style(img, "top", /*clefTop*/ ctx[6][/*clef*/ ctx[0]]);
    			attr_dev(img, "alt", "clef icon");
    			attr_dev(img, "class", "svelte-1hz2bm");
    			add_location(img, file$5, 46, 4, 1419);
    			set_style(g, "transform", "translate(0, " + (/*ledgerLinesAllowed*/ ctx[2] + 0.5) * /*lineSpacing*/ ctx[1] + "px)");
    			add_location(g, file$5, 53, 8, 1626);
    			attr_dev(svg, "width", "100%");
    			attr_dev(svg, "height", "" + (/*clefSvgHeight*/ ctx[8] + "px"));
    			add_location(svg, file$5, 51, 4, 1573);
    			attr_dev(div, "class", "wrapper svelte-1hz2bm");
    			add_location(div, file$5, 45, 0, 1393);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img);
    			append_dev(div, t);
    			append_dev(div, svg);
    			append_dev(svg, g);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(g, null);
    			}

    			append_dev(g, each_1_anchor);
    			if (if_block0) if_block0.m(g, null);
    			if (if_block1) if_block1.m(svg, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*clef*/ 1 && !src_url_equal(img.src, img_src_value = "./clef-" + /*clef*/ ctx[0] + ".svg")) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (!current || dirty & /*clef*/ 1 && img_width_value !== (img_width_value = "" + (/*clefWidth*/ ctx[5][/*clef*/ ctx[0]] + "px"))) {
    				attr_dev(img, "width", img_width_value);
    			}

    			if (!current || dirty & /*clef*/ 1) {
    				set_style(img, "top", /*clefTop*/ ctx[6][/*clef*/ ctx[0]]);
    			}

    			if (dirty & /*staffLines, lineSpacing*/ 130) {
    				each_value_1 = /*staffLines*/ ctx[7];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(g, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}

    			if (/*noteData*/ ctx[3].clef == /*clef*/ ctx[0]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1$2(ctx);
    					if_block0.c();
    					if_block0.m(g, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (!current || dirty & /*ledgerLinesAllowed, lineSpacing*/ 6) {
    				set_style(g, "transform", "translate(0, " + (/*ledgerLinesAllowed*/ ctx[2] + 0.5) * /*lineSpacing*/ ctx[1] + "px)");
    			}

    			if (/*noteData*/ ctx[3].clef == /*clef*/ ctx[0]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*noteData, clef*/ 9) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block$2(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(svg, null);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Staff', slots, []);
    	let { clef } = $$props;
    	let { lineSpacing = 12 } = $$props;
    	let { ledgerLinesAllowed = 2 } = $$props;

    	const clefWidth = {
    		base: lineSpacing * 2.8,
    		treble: lineSpacing * 2.2
    	};

    	const clefTop = { base: '27%', treble: '20%' };
    	const staffLines = [0, 1, 2, 3, 4];
    	const clefSvgHeight = (staffLines.length - 1 + 1 + 2 * ledgerLinesAllowed) * lineSpacing;
    	let noteData;
    	let ledgerLinesY = [];

    	const unsubscribe = note.subscribe(value => {
    		$$invalidate(3, noteData = value);

    		if (Math.abs(noteData.clefCenterOffset) > 5) {
    			let linesNeeded = Math.floor((Math.abs(noteData.clefCenterOffset) - 4) / 2);
    			let linesSide = noteData.clefCenterOffset < 0 ? 'top' : 'bottom';

    			$$invalidate(4, ledgerLinesY = [...Array(linesNeeded).keys()].map(i => {
    				return linesSide == 'top'
    				? -lineSpacing * (i + 1)
    				: lineSpacing * 4 + lineSpacing * (i + 1);
    			}));
    		} else {
    			$$invalidate(4, ledgerLinesY = []);
    		}
    	});

    	onDestroy(unsubscribe);
    	const writable_props = ['clef', 'lineSpacing', 'ledgerLinesAllowed'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Staff> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('clef' in $$props) $$invalidate(0, clef = $$props.clef);
    		if ('lineSpacing' in $$props) $$invalidate(1, lineSpacing = $$props.lineSpacing);
    		if ('ledgerLinesAllowed' in $$props) $$invalidate(2, ledgerLinesAllowed = $$props.ledgerLinesAllowed);
    	};

    	$$self.$capture_state = () => ({
    		onDestroy,
    		Note,
    		note,
    		clef,
    		lineSpacing,
    		ledgerLinesAllowed,
    		clefWidth,
    		clefTop,
    		staffLines,
    		clefSvgHeight,
    		noteData,
    		ledgerLinesY,
    		unsubscribe
    	});

    	$$self.$inject_state = $$props => {
    		if ('clef' in $$props) $$invalidate(0, clef = $$props.clef);
    		if ('lineSpacing' in $$props) $$invalidate(1, lineSpacing = $$props.lineSpacing);
    		if ('ledgerLinesAllowed' in $$props) $$invalidate(2, ledgerLinesAllowed = $$props.ledgerLinesAllowed);
    		if ('noteData' in $$props) $$invalidate(3, noteData = $$props.noteData);
    		if ('ledgerLinesY' in $$props) $$invalidate(4, ledgerLinesY = $$props.ledgerLinesY);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		clef,
    		lineSpacing,
    		ledgerLinesAllowed,
    		noteData,
    		ledgerLinesY,
    		clefWidth,
    		clefTop,
    		staffLines,
    		clefSvgHeight
    	];
    }

    class Staff extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {
    			clef: 0,
    			lineSpacing: 1,
    			ledgerLinesAllowed: 2
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Staff",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*clef*/ ctx[0] === undefined && !('clef' in props)) {
    			console.warn("<Staff> was created without expected prop 'clef'");
    		}
    	}

    	get clef() {
    		throw new Error("<Staff>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set clef(value) {
    		throw new Error("<Staff>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get lineSpacing() {
    		throw new Error("<Staff>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set lineSpacing(value) {
    		throw new Error("<Staff>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get ledgerLinesAllowed() {
    		throw new Error("<Staff>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ledgerLinesAllowed(value) {
    		throw new Error("<Staff>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Keyboard.svelte generated by Svelte v3.47.0 */

    const { Object: Object_1 } = globals;
    const file$4 = "src/Keyboard.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	return child_ctx;
    }

    // (68:4) {#each whiteKeys as key}
    function create_each_block_1(ctx) {
    	let button;
    	let t0_value = (/*showNoteNames*/ ctx[0] ? /*key*/ ctx[8] : ' ') + "";
    	let t0;
    	let t1;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[5](/*key*/ ctx[8]);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(button, "class", "key svelte-xnrqqz");
    			add_location(button, file$4, 68, 8, 1618);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t0);
    			append_dev(button, t1);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*showNoteNames*/ 1 && t0_value !== (t0_value = (/*showNoteNames*/ ctx[0] ? /*key*/ ctx[8] : ' ') + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(68:4) {#each whiteKeys as key}",
    		ctx
    	});

    	return block;
    }

    // (76:4) {#each blackKeys as key}
    function create_each_block(ctx) {
    	let button;

    	const block = {
    		c: function create() {
    			button = element("button");
    			attr_dev(button, "class", "key " + (/*key*/ ctx[8] || 'hidden') + "" + " svelte-xnrqqz");
    			add_location(button, file$4, 76, 8, 1833);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(76:4) {#each blackKeys as key}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let div2;
    	let div0;
    	let t;
    	let div1;
    	let each_value_1 = /*whiteKeys*/ ctx[3];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = /*blackKeys*/ ctx[4];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "id", "white-keys");
    			attr_dev(div0, "class", "svelte-xnrqqz");
    			add_location(div0, file$4, 66, 4, 1557);
    			attr_dev(div1, "id", "black-keys");
    			attr_dev(div1, "class", "svelte-xnrqqz");
    			add_location(div1, file$4, 74, 4, 1772);
    			attr_dev(div2, "class", "wrapper svelte-xnrqqz");
    			attr_dev(div2, "style", /*cssVarStyles*/ ctx[1]);
    			add_location(div2, file$4, 65, 0, 1508);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div0, null);
    			}

    			append_dev(div2, t);
    			append_dev(div2, div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*dispatch, whiteKeys, showNoteNames*/ 13) {
    				each_value_1 = /*whiteKeys*/ ctx[3];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty & /*blackKeys*/ 16) {
    				each_value = /*blackKeys*/ ctx[4];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*cssVarStyles*/ 2) {
    				attr_dev(div2, "style", /*cssVarStyles*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const keyWidthRem = 3;
    const blackKeyWidth = '1.8rem';

    function instance$4($$self, $$props, $$invalidate) {
    	let cssVarStyles;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Keyboard', slots, []);
    	const dispatch = createEventDispatcher();
    	let { showNoteNames = true } = $$props;
    	const whiteKeys = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    	const blackKeys = [1, 1, 0, 1, 1, 1];
    	const keyboardWidth = keyWidthRem * whiteKeys.length + 'rem';

    	let styles = {
    		'key-width': keyWidthRem + 'rem',
    		'black-key-width': blackKeyWidth,
    		'keyboard-width': keyboardWidth,
    		'black-key-offset': keyWidthRem / 2 + 'rem',
    		'blackkeys-width': keyWidthRem * (whiteKeys.length - 1) + 'rem'
    	};

    	const writable_props = ['showNoteNames'];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Keyboard> was created with unknown prop '${key}'`);
    	});

    	const click_handler = key => dispatch('played-note', key);

    	$$self.$$set = $$props => {
    		if ('showNoteNames' in $$props) $$invalidate(0, showNoteNames = $$props.showNoteNames);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		showNoteNames,
    		whiteKeys,
    		blackKeys,
    		keyWidthRem,
    		blackKeyWidth,
    		keyboardWidth,
    		styles,
    		cssVarStyles
    	});

    	$$self.$inject_state = $$props => {
    		if ('showNoteNames' in $$props) $$invalidate(0, showNoteNames = $$props.showNoteNames);
    		if ('styles' in $$props) $$invalidate(7, styles = $$props.styles);
    		if ('cssVarStyles' in $$props) $$invalidate(1, cssVarStyles = $$props.cssVarStyles);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$invalidate(1, cssVarStyles = Object.entries(styles).map(([key, value]) => `--${key}:${value}`).join(';'));
    	return [showNoteNames, cssVarStyles, dispatch, whiteKeys, blackKeys, click_handler];
    }

    class Keyboard extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { showNoteNames: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Keyboard",
    			options,
    			id: create_fragment$4.name
    		});
    	}

    	get showNoteNames() {
    		throw new Error("<Keyboard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set showNoteNames(value) {
    		throw new Error("<Keyboard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/GuessResult.svelte generated by Svelte v3.47.0 */

    const file$3 = "src/GuessResult.svelte";

    function create_fragment$3(ctx) {
    	let div2;
    	let div0;
    	let t0_value = (/*guessResult*/ ctx[0] || ' ') + "";
    	let t0;
    	let t1;
    	let h2;
    	let t3;
    	let div1;
    	let t4;
    	let t5;
    	let br0;
    	let t6;
    	let t7;
    	let t8;
    	let br1;
    	let t9;
    	let t10;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			h2 = element("h2");
    			h2.textContent = "Scoreboard";
    			t3 = space();
    			div1 = element("div");
    			t4 = text("Correct Guesses: ");
    			t5 = text(/*correctCount*/ ctx[1]);
    			br0 = element("br");
    			t6 = text("\n        Current Streak: ");
    			t7 = text(/*correctStreak*/ ctx[2]);
    			t8 = text(" in a row ");
    			br1 = element("br");
    			t9 = text("\n    Longest Streak: ");
    			t10 = text(/*longestStreak*/ ctx[3]);
    			attr_dev(div0, "id", "result");
    			attr_dev(div0, "class", "svelte-8udf4k");
    			add_location(div0, file$3, 33, 4, 615);
    			attr_dev(h2, "class", "svelte-8udf4k");
    			add_location(h2, file$3, 34, 4, 663);
    			add_location(br0, file$3, 35, 40, 723);
    			add_location(br1, file$3, 36, 49, 779);
    			add_location(div1, file$3, 35, 4, 687);
    			attr_dev(div2, "class", "wrapper svelte-8udf4k");
    			add_location(div2, file$3, 32, 0, 589);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, t0);
    			append_dev(div2, t1);
    			append_dev(div2, h2);
    			append_dev(div2, t3);
    			append_dev(div2, div1);
    			append_dev(div1, t4);
    			append_dev(div1, t5);
    			append_dev(div1, br0);
    			append_dev(div1, t6);
    			append_dev(div1, t7);
    			append_dev(div1, t8);
    			append_dev(div1, br1);
    			append_dev(div1, t9);
    			append_dev(div1, t10);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*guessResult*/ 1 && t0_value !== (t0_value = (/*guessResult*/ ctx[0] || ' ') + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*correctCount*/ 2) set_data_dev(t5, /*correctCount*/ ctx[1]);
    			if (dirty & /*correctStreak*/ 4) set_data_dev(t7, /*correctStreak*/ ctx[2]);
    			if (dirty & /*longestStreak*/ 8) set_data_dev(t10, /*longestStreak*/ ctx[3]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('GuessResult', slots, []);
    	let { guessResult } = $$props;
    	let { correctCount } = $$props;
    	let { correctStreak } = $$props;
    	let { longestStreak } = $$props;
    	const writable_props = ['guessResult', 'correctCount', 'correctStreak', 'longestStreak'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<GuessResult> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('guessResult' in $$props) $$invalidate(0, guessResult = $$props.guessResult);
    		if ('correctCount' in $$props) $$invalidate(1, correctCount = $$props.correctCount);
    		if ('correctStreak' in $$props) $$invalidate(2, correctStreak = $$props.correctStreak);
    		if ('longestStreak' in $$props) $$invalidate(3, longestStreak = $$props.longestStreak);
    	};

    	$$self.$capture_state = () => ({
    		guessResult,
    		correctCount,
    		correctStreak,
    		longestStreak
    	});

    	$$self.$inject_state = $$props => {
    		if ('guessResult' in $$props) $$invalidate(0, guessResult = $$props.guessResult);
    		if ('correctCount' in $$props) $$invalidate(1, correctCount = $$props.correctCount);
    		if ('correctStreak' in $$props) $$invalidate(2, correctStreak = $$props.correctStreak);
    		if ('longestStreak' in $$props) $$invalidate(3, longestStreak = $$props.longestStreak);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [guessResult, correctCount, correctStreak, longestStreak];
    }

    class GuessResult extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
    			guessResult: 0,
    			correctCount: 1,
    			correctStreak: 2,
    			longestStreak: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "GuessResult",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*guessResult*/ ctx[0] === undefined && !('guessResult' in props)) {
    			console.warn("<GuessResult> was created without expected prop 'guessResult'");
    		}

    		if (/*correctCount*/ ctx[1] === undefined && !('correctCount' in props)) {
    			console.warn("<GuessResult> was created without expected prop 'correctCount'");
    		}

    		if (/*correctStreak*/ ctx[2] === undefined && !('correctStreak' in props)) {
    			console.warn("<GuessResult> was created without expected prop 'correctStreak'");
    		}

    		if (/*longestStreak*/ ctx[3] === undefined && !('longestStreak' in props)) {
    			console.warn("<GuessResult> was created without expected prop 'longestStreak'");
    		}
    	}

    	get guessResult() {
    		throw new Error("<GuessResult>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set guessResult(value) {
    		throw new Error("<GuessResult>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get correctCount() {
    		throw new Error("<GuessResult>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set correctCount(value) {
    		throw new Error("<GuessResult>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get correctStreak() {
    		throw new Error("<GuessResult>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set correctStreak(value) {
    		throw new Error("<GuessResult>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get longestStreak() {
    		throw new Error("<GuessResult>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set longestStreak(value) {
    		throw new Error("<GuessResult>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Timer.svelte generated by Svelte v3.47.0 */
    const file$2 = "src/Timer.svelte";

    // (102:8) {:else}
    function create_else_block_1(ctx) {
    	let button;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text("Start");
    			button.disabled = /*editTimer*/ ctx[1];
    			attr_dev(button, "class", "svelte-nlajzt");
    			add_location(button, file$2, 102, 12, 2141);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*startTimer*/ ctx[5], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*editTimer*/ 2) {
    				prop_dev(button, "disabled", /*editTimer*/ ctx[1]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(102:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (100:8) {#if counterRunning}
    function create_if_block_2(ctx) {
    	let button;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text("Pause");
    			button.disabled = /*editTimer*/ ctx[1];
    			attr_dev(button, "class", "svelte-nlajzt");
    			add_location(button, file$2, 100, 12, 2043);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*pauseTimer*/ ctx[6], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*editTimer*/ 2) {
    				prop_dev(button, "disabled", /*editTimer*/ ctx[1]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(100:8) {#if counterRunning}",
    		ctx
    	});

    	return block;
    }

    // (112:8) {:else}
    function create_else_block(ctx) {
    	let span;
    	let t0;
    	let t1;
    	let if_block_anchor;
    	let mounted;
    	let dispose;
    	let if_block = !/*counterRunning*/ ctx[2] & /*secondsLeft*/ ctx[4] == /*timerLength*/ ctx[0] && create_if_block_1$1(ctx);

    	const block = {
    		c: function create() {
    			span = element("span");
    			t0 = text(/*secondsLeft*/ ctx[4]);
    			t1 = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			attr_dev(span, "class", "clock svelte-nlajzt");
    			add_location(span, file$2, 112, 8, 2618);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t0);
    			insert_dev(target, t1, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);

    			if (!mounted) {
    				dispose = listen_dev(span, "click", /*click_handler_1*/ ctx[10], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*secondsLeft*/ 16) set_data_dev(t0, /*secondsLeft*/ ctx[4]);

    			if (!/*counterRunning*/ ctx[2] & /*secondsLeft*/ ctx[4] == /*timerLength*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1$1(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			if (detaching) detach_dev(t1);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(112:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (109:8) {#if editTimer}
    function create_if_block$1(ctx) {
    	let input;
    	let t0;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			t0 = space();
    			button = element("button");
    			button.textContent = "✅";
    			attr_dev(input, "class", "clock svelte-nlajzt");
    			attr_dev(input, "type", "text");
    			attr_dev(input, "size", "2");
    			input.autofocus = true;
    			add_location(input, file$2, 109, 12, 2424);
    			attr_dev(button, "class", "edit-clock svelte-nlajzt");
    			add_location(button, file$2, 110, 12, 2514);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			set_input_value(input, /*timerLength*/ ctx[0]);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, button, anchor);
    			input.focus();

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[8]),
    					listen_dev(button, "click", /*click_handler*/ ctx[9], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*timerLength*/ 1 && input.value !== /*timerLength*/ ctx[0]) {
    				set_input_value(input, /*timerLength*/ ctx[0]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(button);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(109:8) {#if editTimer}",
    		ctx
    	});

    	return block;
    }

    // (114:12) {#if !counterRunning & secondsLeft == timerLength}
    function create_if_block_1$1(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "✎";
    			attr_dev(button, "class", "edit-clock svelte-nlajzt");
    			add_location(button, file$2, 114, 12, 2776);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_2*/ ctx[11], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(114:12) {#if !counterRunning & secondsLeft == timerLength}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div3;
    	let div0;
    	let t0;
    	let button;
    	let t1;
    	let t2;
    	let div2;
    	let div1;
    	let t3;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*counterRunning*/ ctx[2]) return create_if_block_2;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (/*editTimer*/ ctx[1]) return create_if_block$1;
    		return create_else_block;
    	}

    	let current_block_type_1 = select_block_type_1(ctx);
    	let if_block1 = current_block_type_1(ctx);

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div0 = element("div");
    			if_block0.c();
    			t0 = space();
    			button = element("button");
    			t1 = text("Reset");
    			t2 = space();
    			div2 = element("div");
    			div1 = element("div");
    			if_block1.c();
    			t3 = text("\n        Seconds Left");
    			button.disabled = /*editTimer*/ ctx[1];
    			attr_dev(button, "class", "svelte-nlajzt");
    			add_location(button, file$2, 104, 8, 2229);
    			attr_dev(div0, "class", "btn-group svelte-nlajzt");
    			add_location(div0, file$2, 98, 4, 1978);
    			attr_dev(div1, "id", "counter");
    			attr_dev(div1, "class", "svelte-nlajzt");
    			add_location(div1, file$2, 107, 8, 2369);
    			attr_dev(div2, "id", "seconds");
    			set_style(div2, "font-weight", /*weight*/ ctx[3]);
    			attr_dev(div2, "class", "svelte-nlajzt");
    			add_location(div2, file$2, 106, 4, 2310);
    			attr_dev(div3, "class", "wrapper svelte-nlajzt");
    			add_location(div3, file$2, 97, 0, 1952);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			if_block0.m(div0, null);
    			append_dev(div0, t0);
    			append_dev(div0, button);
    			append_dev(button, t1);
    			append_dev(div3, t2);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			if_block1.m(div1, null);
    			append_dev(div2, t3);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*resetTimer*/ ctx[7], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(div0, t0);
    				}
    			}

    			if (dirty & /*editTimer*/ 2) {
    				prop_dev(button, "disabled", /*editTimer*/ ctx[1]);
    			}

    			if (current_block_type_1 === (current_block_type_1 = select_block_type_1(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type_1(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(div1, null);
    				}
    			}

    			if (dirty & /*weight*/ 8) {
    				set_style(div2, "font-weight", /*weight*/ ctx[3]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			if_block0.d();
    			if_block1.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let secondsLeft;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Timer', slots, []);
    	const dispatch = createEventDispatcher();
    	let timerLength = 60;
    	let editTimer = false;
    	let counter;
    	let counterRunning = false;
    	let weight = 'normal';

    	function startTimer() {
    		if (secondsLeft == 0) {
    			resetTimer();
    		}

    		note.new();
    		$$invalidate(2, counterRunning = true);

    		counter = setInterval(
    			() => {
    				if (secondsLeft > 0) {
    					$$invalidate(4, secondsLeft--, secondsLeft);

    					if (secondsLeft < 10) {
    						$$invalidate(3, weight = 'bold');
    					}
    				} else {
    					note.clear();
    					$$invalidate(2, counterRunning = false);
    					clearInterval(counter);
    				}
    			},
    			1000
    		);
    	}

    	function pauseTimer() {
    		$$invalidate(2, counterRunning = false);
    		note.clear();
    		clearInterval(counter);
    	}

    	function resetTimer() {
    		pauseTimer();
    		$$invalidate(4, secondsLeft = timerLength);
    		$$invalidate(3, weight = 'normal');
    		dispatch('reset');
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Timer> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		timerLength = this.value;
    		$$invalidate(0, timerLength);
    	}

    	const click_handler = () => {
    		$$invalidate(1, editTimer = !editTimer);
    	};

    	const click_handler_1 = () => {
    		$$invalidate(1, editTimer = !editTimer);
    	};

    	const click_handler_2 = () => {
    		$$invalidate(1, editTimer = !editTimer);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		note,
    		dispatch,
    		timerLength,
    		editTimer,
    		counter,
    		counterRunning,
    		weight,
    		startTimer,
    		pauseTimer,
    		resetTimer,
    		secondsLeft
    	});

    	$$self.$inject_state = $$props => {
    		if ('timerLength' in $$props) $$invalidate(0, timerLength = $$props.timerLength);
    		if ('editTimer' in $$props) $$invalidate(1, editTimer = $$props.editTimer);
    		if ('counter' in $$props) counter = $$props.counter;
    		if ('counterRunning' in $$props) $$invalidate(2, counterRunning = $$props.counterRunning);
    		if ('weight' in $$props) $$invalidate(3, weight = $$props.weight);
    		if ('secondsLeft' in $$props) $$invalidate(4, secondsLeft = $$props.secondsLeft);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*timerLength*/ 1) {
    			$$invalidate(4, secondsLeft = timerLength);
    		}
    	};

    	return [
    		timerLength,
    		editTimer,
    		counterRunning,
    		weight,
    		secondsLeft,
    		startTimer,
    		pauseTimer,
    		resetTimer,
    		input_input_handler,
    		click_handler,
    		click_handler_1,
    		click_handler_2
    	];
    }

    class Timer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Timer",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/Attribution.svelte generated by Svelte v3.47.0 */

    const file$1 = "src/Attribution.svelte";

    function create_fragment$1(ctx) {
    	let div;
    	let t0;
    	let a0;
    	let t2;
    	let a1;
    	let t4;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text("clef image src: ");
    			a0 = element("a");
    			a0.textContent = "っ";
    			t2 = text(", ");
    			a1 = element("a");
    			a1.textContent = "CC BY-SA 3.0";
    			t4 = text(", via Wikimedia Commons");
    			attr_dev(a0, "href", "https://commons.wikimedia.org/wiki/File:FClef.svg");
    			attr_dev(a0, "class", "svelte-gow82j");
    			add_location(a0, file$1, 18, 16, 344);
    			attr_dev(a1, "href", "http://creativecommons.org/licenses/by-sa/3.0/");
    			attr_dev(a1, "class", "svelte-gow82j");
    			add_location(a1, file$1, 18, 83, 411);
    			attr_dev(div, "class", "svelte-gow82j");
    			add_location(div, file$1, 17, 0, 322);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, a0);
    			append_dev(div, t2);
    			append_dev(div, a1);
    			append_dev(div, t4);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Attribution', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Attribution> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Attribution extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Attribution",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.47.0 */
    const file = "src/App.svelte";

    // (110:3) {#if playWithTimer}
    function create_if_block_1(ctx) {
    	let timer;
    	let current;
    	timer = new Timer({ $$inline: true });
    	timer.$on("reset", /*resetGame*/ ctx[7]);

    	const block = {
    		c: function create() {
    			create_component(timer.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(timer, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(timer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(timer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(timer, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(110:3) {#if playWithTimer}",
    		ctx
    	});

    	return block;
    }

    // (122:3) {#if playWithTimer}
    function create_if_block(ctx) {
    	let timer;
    	let current;
    	timer = new Timer({ $$inline: true });
    	timer.$on("reset", /*resetGame*/ ctx[7]);

    	const block = {
    		c: function create() {
    			create_component(timer.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(timer, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(timer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(timer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(timer, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(122:3) {#if playWithTimer}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let h1;
    	let t1;
    	let div5;
    	let div1;
    	let div0;
    	let t2;
    	let staff0;
    	let t3;
    	let staff1;
    	let t4;
    	let keyboard;
    	let t5;
    	let div4;
    	let div2;
    	let t6;
    	let guessresult;
    	let t7;
    	let div3;
    	let button0;
    	let t8;
    	let t9_value = (/*playWithTimer*/ ctx[3] ? 'Without' : 'With') + "";
    	let t9;
    	let t10;
    	let t11;
    	let button1;
    	let t12_value = (/*showNoteNames*/ ctx[4] ? 'Hide' : 'Show') + "";
    	let t12;
    	let t13;
    	let t14;
    	let footer;
    	let attribution;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = /*playWithTimer*/ ctx[3] && create_if_block_1(ctx);

    	staff0 = new Staff({
    			props: { clef: "treble" },
    			$$inline: true
    		});

    	staff1 = new Staff({ props: { clef: "base" }, $$inline: true });

    	keyboard = new Keyboard({
    			props: { showNoteNames: /*showNoteNames*/ ctx[4] },
    			$$inline: true
    		});

    	keyboard.$on("played-note", /*handleGuess*/ ctx[6]);
    	let if_block1 = /*playWithTimer*/ ctx[3] && create_if_block(ctx);

    	guessresult = new GuessResult({
    			props: {
    				guessResult: /*guessResult*/ ctx[5],
    				correctCount: /*correctCount*/ ctx[0],
    				correctStreak: /*correctStreak*/ ctx[1],
    				longestStreak: /*longestStreak*/ ctx[2]
    			},
    			$$inline: true
    		});

    	attribution = new Attribution({ $$inline: true });

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Piano Flashcard Game";
    			t1 = space();
    			div5 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			if (if_block0) if_block0.c();
    			t2 = space();
    			create_component(staff0.$$.fragment);
    			t3 = space();
    			create_component(staff1.$$.fragment);
    			t4 = space();
    			create_component(keyboard.$$.fragment);
    			t5 = space();
    			div4 = element("div");
    			div2 = element("div");
    			if (if_block1) if_block1.c();
    			t6 = space();
    			create_component(guessresult.$$.fragment);
    			t7 = space();
    			div3 = element("div");
    			button0 = element("button");
    			t8 = text("Play ");
    			t9 = text(t9_value);
    			t10 = text(" Timer");
    			t11 = space();
    			button1 = element("button");
    			t12 = text(t12_value);
    			t13 = text(" Note Names");
    			t14 = space();
    			footer = element("footer");
    			create_component(attribution.$$.fragment);
    			attr_dev(h1, "class", "svelte-51b3mg");
    			add_location(h1, file, 105, 0, 1918);
    			attr_dev(div0, "id", "mobile-timer");
    			attr_dev(div0, "class", "svelte-51b3mg");
    			add_location(div0, file, 108, 2, 1984);
    			attr_dev(div1, "class", "svelte-51b3mg");
    			add_location(div1, file, 107, 1, 1976);
    			attr_dev(div2, "id", "desktop-timer");
    			attr_dev(div2, "class", "svelte-51b3mg");
    			add_location(div2, file, 120, 2, 2230);
    			attr_dev(button0, "id", "toggle-timer");
    			attr_dev(button0, "class", "svelte-51b3mg");
    			add_location(button0, file, 127, 3, 2439);
    			attr_dev(button1, "id", "toggle-note-names");
    			attr_dev(button1, "class", "svelte-51b3mg");
    			add_location(button1, file, 128, 3, 2548);
    			attr_dev(div3, "class", "btn-group svelte-51b3mg");
    			add_location(div3, file, 126, 2, 2412);
    			attr_dev(div4, "id", "scoreboard");
    			attr_dev(div4, "class", "svelte-51b3mg");
    			add_location(div4, file, 119, 1, 2205);
    			attr_dev(div5, "class", "game-wrapper svelte-51b3mg");
    			add_location(div5, file, 106, 0, 1948);
    			add_location(footer, file, 132, 0, 2685);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div1);
    			append_dev(div1, div0);
    			if (if_block0) if_block0.m(div0, null);
    			append_dev(div1, t2);
    			mount_component(staff0, div1, null);
    			append_dev(div1, t3);
    			mount_component(staff1, div1, null);
    			append_dev(div1, t4);
    			mount_component(keyboard, div1, null);
    			append_dev(div5, t5);
    			append_dev(div5, div4);
    			append_dev(div4, div2);
    			if (if_block1) if_block1.m(div2, null);
    			append_dev(div4, t6);
    			mount_component(guessresult, div4, null);
    			append_dev(div4, t7);
    			append_dev(div4, div3);
    			append_dev(div3, button0);
    			append_dev(button0, t8);
    			append_dev(button0, t9);
    			append_dev(button0, t10);
    			append_dev(div3, t11);
    			append_dev(div3, button1);
    			append_dev(button1, t12);
    			append_dev(button1, t13);
    			insert_dev(target, t14, anchor);
    			insert_dev(target, footer, anchor);
    			mount_component(attribution, footer, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*toggleTimer*/ ctx[8], false, false, false),
    					listen_dev(button1, "click", /*toggleNoteNames*/ ctx[9], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*playWithTimer*/ ctx[3]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty & /*playWithTimer*/ 8) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div0, null);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			const keyboard_changes = {};
    			if (dirty & /*showNoteNames*/ 16) keyboard_changes.showNoteNames = /*showNoteNames*/ ctx[4];
    			keyboard.$set(keyboard_changes);

    			if (/*playWithTimer*/ ctx[3]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*playWithTimer*/ 8) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div2, null);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			const guessresult_changes = {};
    			if (dirty & /*guessResult*/ 32) guessresult_changes.guessResult = /*guessResult*/ ctx[5];
    			if (dirty & /*correctCount*/ 1) guessresult_changes.correctCount = /*correctCount*/ ctx[0];
    			if (dirty & /*correctStreak*/ 2) guessresult_changes.correctStreak = /*correctStreak*/ ctx[1];
    			if (dirty & /*longestStreak*/ 4) guessresult_changes.longestStreak = /*longestStreak*/ ctx[2];
    			guessresult.$set(guessresult_changes);
    			if ((!current || dirty & /*playWithTimer*/ 8) && t9_value !== (t9_value = (/*playWithTimer*/ ctx[3] ? 'Without' : 'With') + "")) set_data_dev(t9, t9_value);
    			if ((!current || dirty & /*showNoteNames*/ 16) && t12_value !== (t12_value = (/*showNoteNames*/ ctx[4] ? 'Hide' : 'Show') + "")) set_data_dev(t12, t12_value);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(staff0.$$.fragment, local);
    			transition_in(staff1.$$.fragment, local);
    			transition_in(keyboard.$$.fragment, local);
    			transition_in(if_block1);
    			transition_in(guessresult.$$.fragment, local);
    			transition_in(attribution.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(staff0.$$.fragment, local);
    			transition_out(staff1.$$.fragment, local);
    			transition_out(keyboard.$$.fragment, local);
    			transition_out(if_block1);
    			transition_out(guessresult.$$.fragment, local);
    			transition_out(attribution.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div5);
    			if (if_block0) if_block0.d();
    			destroy_component(staff0);
    			destroy_component(staff1);
    			destroy_component(keyboard);
    			if (if_block1) if_block1.d();
    			destroy_component(guessresult);
    			if (detaching) detach_dev(t14);
    			if (detaching) detach_dev(footer);
    			destroy_component(attribution);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let $note;
    	validate_store(note, 'note');
    	component_subscribe($$self, note, $$value => $$invalidate(10, $note = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let correctCount = 0;
    	let correctStreak = 0;
    	let longestStreak = 0;
    	let playWithTimer = true;
    	let showNoteNames = true;
    	let guessResult;

    	function handleGuess(event) {
    		if ($note.name) {
    			if (event.detail == $note.name) {
    				$$invalidate(5, guessResult = '✅');
    				note.new();
    				$$invalidate(0, correctCount++, correctCount);
    				$$invalidate(1, correctStreak++, correctStreak);

    				if (correctStreak > longestStreak) {
    					$$invalidate(2, longestStreak = correctStreak);
    				}
    			} else {
    				$$invalidate(1, correctStreak = 0);
    				$$invalidate(5, guessResult = '❌');
    			}
    		}
    	}

    	function resetGame() {
    		$$invalidate(0, correctCount = 0);
    		$$invalidate(1, correctStreak = 0);
    		$$invalidate(2, longestStreak = 0);
    		$$invalidate(5, guessResult = null);
    		note.clear();
    	}

    	function toggleTimer() {
    		resetGame();
    		$$invalidate(3, playWithTimer = !playWithTimer);

    		if (!playWithTimer) {
    			note.new();
    		}
    	}

    	function toggleNoteNames() {
    		$$invalidate(4, showNoteNames = !showNoteNames);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Staff,
    		Keyboard,
    		GuessResult,
    		Timer,
    		Attribution,
    		note,
    		correctCount,
    		correctStreak,
    		longestStreak,
    		playWithTimer,
    		showNoteNames,
    		guessResult,
    		handleGuess,
    		resetGame,
    		toggleTimer,
    		toggleNoteNames,
    		$note
    	});

    	$$self.$inject_state = $$props => {
    		if ('correctCount' in $$props) $$invalidate(0, correctCount = $$props.correctCount);
    		if ('correctStreak' in $$props) $$invalidate(1, correctStreak = $$props.correctStreak);
    		if ('longestStreak' in $$props) $$invalidate(2, longestStreak = $$props.longestStreak);
    		if ('playWithTimer' in $$props) $$invalidate(3, playWithTimer = $$props.playWithTimer);
    		if ('showNoteNames' in $$props) $$invalidate(4, showNoteNames = $$props.showNoteNames);
    		if ('guessResult' in $$props) $$invalidate(5, guessResult = $$props.guessResult);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		correctCount,
    		correctStreak,
    		longestStreak,
    		playWithTimer,
    		showNoteNames,
    		guessResult,
    		handleGuess,
    		resetGame,
    		toggleTimer,
    		toggleNoteNames
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
