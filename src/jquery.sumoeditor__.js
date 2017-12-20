k = katex.renderToString('\\sqrt{T}^{T}')
k.match(/(<[^<]+>T<[^>]+>)/g).forEach(function(x){
    console.log(x);
    var cls = x.match(/(class\s*=\s*"[^"]+)/gi)
    if(cls && cls.length){
        cus = x.replace(cls[0], cls[0] + ' mycustomClass')
    }
    else{
        y = x.split('>')
        y[0] += ' class="mycustomClass"'
        cus = y.join('>')
    }
    cus = cus.replace('>T<', '>[]<')
    k = k.replace(x, cus)
})
$($0).html(k)