/**
 * Definition List plugin for tinyMCE editor - Version 6
 *
 * The tinyMCE core 'lists' plugin basically contains the entire functionality for 
 * inserting definition lists - although unfortunately neither a toolbar button nor
 * a menu entry is defined for this :-(
 * (i've no idea, why this little step wasn't done inside of the existing plugin...).
 *
 * To toggle the button state correctly, some internal functions are required, which 
 * would make it very complex to implement the desired button via 
 * `tinymce.init('{... setup => ...}')`  
 *
 * For this reason, this additional plugin was created, in which the mentioned internal 
 * helper functions were copied from the above plugin and also the `InsertDefinitionList`
 * command implemented there is called directly.
 *
 * @author S.Kientzler <s.kientzler@online.de>
 * @link https://github.com/Stefanius67/tinyMCE-DefinitionList
 */

tinymce.PluginManager.add('deflist', function(editor, url){
    
    if (!editor.hasPlugin('lists')) {
        console.error('Please use the Lists plugin together with the Definition List plugin.');
    }

	editor.options.register('deflist_iconsize', {
		processor: 'number',
		default: 24,
	});

    // unfortunately, some minimmizer has problems with 'ECMAScript 6 template literals' :-(
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals

    // our internal button definitions
    const size = editor.options.get('deflist_iconsize');
    const svgButton_DL = 
        '<svg height="' + size + '" width="' + size + '" viewBox="0 0 100 100">' +
        '  <rect fill="rgb(52,52,52)" stroke="none" x="8" y="12" width="60" height="9" rx="4"/>' +
        '  <rect fill="rgb(52,52,52)" stroke="none" x="25" y="29" width="64" height="5" rx="2"/>' +
        '  <rect fill="rgb(52,52,52)" stroke="none" x="25" y="41" width="64" height="5" rx="2"/>' +
        '  <rect fill="rgb(52,52,52)" stroke="none" x="8" y="56" width="60" height="9" rx="4"/>' +
        '  <rect fill="rgb(52,52,52)" stroke="none" x="25" y="73" width="64" height="5" rx="2"/>' +
        '  <rect fill="rgb(52,52,52)" stroke="none" x="25" y="85" width="64" height="5" rx="2"/>' +
        '</svg>';
    const svgButton_DT = 
        '<svg height="' + size + '" width="' + size + '" viewBox="0 0 100 100">' +
        '  <rect fill="rgb(52,52,52)" stroke="none" x="8" y="12" width="60" height="9" rx="4"/>' +
        '  <rect fill="rgb(192,192,192)" stroke="none" x="25" y="29" width="64" height="5" rx="2"/>' +
        '  <rect fill="rgb(192,192,192)" stroke="none" x="25" y="41" width="64" height="5" rx="2"/>' +
        '  <rect fill="rgb(52,52,52)" stroke="none" x="8" y="56" width="60" height="9" rx="4"/>' +
        '  <rect fill="rgb(192,192,192)" stroke="none" x="25" y="73" width="64" height="5" rx="2"/>' +
        '  <rect fill="rgb(192,192,192)" stroke="none" x="25" y="85" width="64" height="5" rx="2"/>' +
        '</svg>';
    const svgButton_DD = 
        '<svg height="' + size + '" width="' + size + '" viewBox="0 0 100 100">' +
        '  <rect fill="rgb(192,192,192)" stroke="none" x="8" y="12" width="60" height="9" rx="4"/>' +
        '  <rect fill="rgb(52,52,52)" stroke="none" x="25" y="29" width="64" height="5" rx="2"/>' +
        '  <rect fill="rgb(52,52,52)" stroke="none" x="25" y="41" width="64" height="5" rx="2"/>' +
        '  <rect fill="rgb(192,192,192)" stroke="none" x="8" y="56" width="60" height="9" rx="4"/>' +
        '  <rect fill="rgb(52,52,52)" stroke="none" x="25" y="73" width="64" height="5" rx="2"/>' +
        '  <rect fill="rgb(52,52,52)" stroke="none" x="25" y="85" width="64" height="5" rx="2"/>' +
        '</svg>';

    // ... that can be overridden in the options with either
    // - an own svg definition (MUST start with '<svg'!))
    // - an icon name that corresponds to an icon
    //   1. in the icon pack  
    //      https://www.tiny.cloud/docs/tinymce/6/editor-icon-identifiers
    //   2. in a custom icon pack
    //      https://www.tiny.cloud/docs/tinymce/6/creating-an-icon-pack
    //   3. or added using the `addIcon` API
    //      https://www.tiny.cloud/docs/tinymce/6/apis/tinymce.editor.ui.registry/#addIcon
	editor.options.register('deflist_icon', {
		processor: 'string',
		default: svgButton_DL,
	});
	editor.options.register('deflist_title_icon', {
		processor: 'string',
		default: svgButton_DT,
	});
	editor.options.register('deflist_descr_icon', {
		processor: 'string',
		default: svgButton_DD,
	});
    const deflistIconDL = editor.options.get('deflist_icon');
    const deflistIconDT = editor.options.get('deflist_title_icon');
    const deflistIconDD = editor.options.get('deflist_descr_icon');

    /*--------------------------------------------- 
     * Helpers copied from the core lists plugin
     *-----------------------------+++++++---------*/
    const isNullable = a => a === null || a === undefined;
    const isNonNullable = a => !isNullable(a);
    
    
    class Optional {
      constructor(tag, value) {
        this.tag = tag;
        this.value = value;
      }
      static some(value) {
        return new Optional(true, value);
      }
      static none() {
        return Optional.singletonNone;
      }
      fold(onNone, onSome) {
        if (this.tag) {
          return onSome(this.value);
        } else {
          return onNone();
        }
      }
      isSome() {
        return this.tag;
      }
      isNone() {
        return !this.tag;
      }
      map(mapper) {
        if (this.tag) {
          return Optional.some(mapper(this.value));
        } else {
          return Optional.none();
        }
      }
      bind(binder) {
        if (this.tag) {
          return binder(this.value);
        } else {
          return Optional.none();
        }
      }
      exists(predicate) {
        return this.tag && predicate(this.value);
      }
      forall(predicate) {
        return !this.tag || predicate(this.value);
      }
      filter(predicate) {
        if (!this.tag || predicate(this.value)) {
          return this;
        } else {
          return Optional.none();
        }
      }
      getOr(replacement) {
        return this.tag ? this.value : replacement;
      }
      or(replacement) {
        return this.tag ? this : replacement;
      }
      getOrThunk(thunk) {
        return this.tag ? this.value : thunk();
      }
      orThunk(thunk) {
        return this.tag ? this : thunk();
      }
      getOrDie(message) {
        if (!this.tag) {
          throw new Error(message !== null && message !== void 0 ? message : 'Called getOrDie on None');
        } else {
          return this.value;
        }
      }
      static from(value) {
        return isNonNullable(value) ? Optional.some(value) : Optional.none();
      }
      getOrNull() {
        return this.tag ? this.value : null;
      }
      getOrUndefined() {
        return this.value;
      }
      each(worker) {
        if (this.tag) {
          worker(this.value);
        }
      }
      toArray() {
        return this.tag ? [this.value] : [];
      }
      toString() {
        return this.tag ? `some(${ this.value })` : 'none()';
      }
    }
    Optional.singletonNone = new Optional(false);
   
    const findUntil = (xs, pred, until) => {
      for (let i = 0, len = xs.length; i < len; i++) {
        const x = xs[i];
        if (pred(x, i)) {
          return Optional.some(x);
        } else if (until(x, i)) {
          break;
        }
      }
      return Optional.none();
    };
    const matchNodeNames = regex => node => isNonNullable(node) && regex.test(node.nodeName);
    const isListNode = matchNodeNames(/^(OL|UL|DL)$/);
    const isTableCellNode = matchNodeNames(/^(TH|TD)$/);
    
    const isCustomList = list => /\btox\-/.test(list.className);
    const inList = (parents, listName) => findUntil(parents, isListNode, isTableCellNode).exists(list => list.nodeName === listName && !isCustomList(list));
    const isWithinNonEditable = (editor, element) => element !== null && !editor.dom.isEditable(element);
    const isWithinNonEditableList = (editor, element) => {
      const parentList = editor.dom.getParent(element, 'ol,ul,dl');
      return isWithinNonEditable(editor, parentList);
    };

    const setNodeChangeHandler = (editor, nodeChangeHandler) => {
      const initialNode = editor.selection.getNode();
      nodeChangeHandler({
        parents: editor.dom.getParents(initialNode),
        element: initialNode
      });
      editor.on('NodeChange', nodeChangeHandler);
      return () => editor.off('NodeChange', nodeChangeHandler);
    };

    const setupToggleButtonHandler = (editor, listName) => api => {
        const toggleButtonHandler = e => {
            api.setActive(inList(e.parents, listName));
            api.setEnabled(!isWithinNonEditableList(editor, e.element) && editor.selection.isEditable());
        };
        api.setEnabled(editor.selection.isEditable());
        return setNodeChangeHandler(editor, toggleButtonHandler);
    };
    /*-------------------------------------- 
     * End of helpers from the lists plugin
     *--------------------------------------*/
    const registerIcon = (value, alias) => {
        if (value.trim().substring(0, 4).toLowerCase() === '<svg') {
            editor.ui.registry.addIcon(alias, value);
            return alias;
        } else {
            return value;
        }
    };
    const iconDL = registerIcon(deflistIconDL, '_deflist_DL');
    const iconDT = registerIcon(deflistIconDT, '_deflist_DT');
    const iconDD = registerIcon(deflistIconDD, '_deflist_DD');
    
    /*
    var iconDL = deflistIconDL;
    if (iconDL.trim().substring(0, 4).toLowerCase() === '<svg') {
        editor.ui.registry.addIcon('_deflist_DL', iconDL);
        iconDL = '_deflist_DL';
    }
    var iconDT = deflistIconDT;
    if (iconDT.trim().substring(0, 4).toLowerCase() === '<svg') {
        editor.ui.registry.addIcon('_deflist_DT', iconDT);
        iconDD = '_deflist_DT';
    }
    var iconDD = deflistIconDD;
    if (iconDD.trim().substring(0, 4).toLowerCase() === '<svg') {
        editor.ui.registry.addIcon('_deflist_DD', iconDD);
        iconDD = '_deflist_DD';
    }
    */
    
    // editor.ui.registry.addIcon('_deflist_t', svgButton_t);
    // editor.ui.registry.addIcon('_deflist_d', svgButton_d);
    
    editor.ui.registry.addSplitButton('deflist', {
        tooltip: 'Definition-list',
        icon: iconDL,
        fetch: callback => {
            const curnode = editor.selection.getNode();
            const items = [
                {
                    type: 'choiceitem',
                    value: 'dt',
                    icon: iconDT,
                    text: 'Definition-list title',
                    enabled: editor.selection.getNode().nodeName == 'DD',
                }, {
                    type: 'choiceitem',
                    value: 'dd',
                    icon: iconDD,
                    text: 'Definition-list description',
                    enabled: editor.selection.getNode().nodeName == 'DT',
                }
            ];
            callback(items);
        },
        onAction: (_) => tinymce.activeEditor.execCommand('InsertDefinitionList', false, {}),
        onItemAction: (api, value) => {
            // console.log('Definition-list splitbutton: ' + value);
            if (value === 'dd') {
                tinymce.activeEditor.execCommand('Indent', false, {});
            } else {
                tinymce.activeEditor.execCommand('Outdent', false, {});
            }
        },
        onSetup: setupToggleButtonHandler(editor, 'DL')
    });
});

/**
 * at first step only the german translation is available
 */
tinymce.PluginManager.requireLangPack('deflist', 'de');
