
const subs = list => {
    if(list.length) {
        const [ x, ...xs ] = list
        const yss = subs(xs)
        return yss.concat(
            yss.map(ys =>
                ([ x, ...ys ])
            )
        )
    } else {
        return [ [] ]
    }
}

export default subs
