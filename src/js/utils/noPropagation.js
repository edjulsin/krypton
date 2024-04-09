export default (cb = v => v) => e => (
    e.stopPropagation(),
    cb(e)
)