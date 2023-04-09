let ratio = 1, waitReplaceList = [];

window.onload = function() {
    const svgOld = document.getElementById('svg-old');

    //转换后尺寸输入事件
    const size = document.getElementById('size');
    let reg = /\d+/;
    size.addEventListener('input', e => {
        const _value = reg.exec(e.target.value);
        if(_value) size.value = _value;
        sizeVal = size.value;
        disposeFunc();
    });

    //转换后回显
    const translate = document.getElementById('translate');

    //预览盒子
    const preview = document.getElementById('preview');
    const preview2 = document.getElementById('preview2');

    //svg源码输入事件
    svgOld.addEventListener('input', e => {
        disposeFunc();
    });

    const disposeFunc = function() {
        let str = svgOld.value;
        if(!str || str === '') return;
        preview.innerHTML = str;
    
        disposeViewBox(str);
        disposeD(str);
    
        waitReplaceList.forEach(item => {
            str = str.replace(item.oldStr,item.newStr);
        });
        translate.value = str;
        
        preview2.innerHTML = str;

        waitReplaceList = [];
    }
    
    //处理viewBox
    const disposeViewBox = function(value) {
        if(!size.value || size.value === '') return;
    
        let viewBoxReg = /viewBox="(\d+ ){3}\d+"/;
        let viewBoxVal = viewBoxReg.exec(value);
        let viewBoxValReg = /(\d+ ){3}\d+/;
        let viewBoxValVal = viewBoxValReg.exec(viewBoxVal[0]);
        let _viewBoxVal = viewBoxValVal[0].split(' ');
        ratio = size.value / _viewBoxVal[2];
        let str = '';
        _viewBoxVal.forEach((item,idx) => {
            let _item = parseInt(item);
            switch(idx) {
                case 0:
                case 1:
                    str += _item * ratio + ' ';
                    break;
                case 2:
                    str += size.value + ' ';
                    break;
                case 3:
                    str += size.value;
                    break;
            }
        });
        waitReplaceList.push({
            oldStr: viewBoxValVal[0],
            newStr: str
        });
    }
    
    //处理d
    const disposeD = function(value) {
        if(!size.value || size.value === '') return;
        let dReg = / d="[0-9a-zA-Z\-., ]+"/g;
        let dVal = dReg[Symbol.matchAll](value);
        let dValReg = /[0-9a-zA-Z\-., ]+/;
        [...dVal].forEach(item => {
            item[0] = item[0].replace(" d=","");
            let dValVal = dValReg.exec(item[0]);
            const commands = /[a-zA-Z]+[0-9.,\- ]+/g[Symbol.matchAll](dValVal[0]);
            [...commands].forEach(item2 => {
                let newStr = '';
                if(item2[0].indexOf('a') !== -1 || item2[0].indexOf('A') !== -1) {
                    let counter = -1;
                    newStr = item2[0].replaceAll(/[0-9.]+/g,function(data) {
                        counter++;
                        return counter % 7 === 3 || counter % 7 === 4 ? data : new Decimal(data).mul(ratio);
                    });
                }else {
                    newStr = item2[0].replaceAll(/[0-9.]+/g,function(data) {
                        return new Decimal(data).mul(ratio);
                    });
                }
                waitReplaceList.push({
                    oldStr: item2[0],
                    newStr
                });
            });
        });
    }
}