export default (cb = v => v) => e => (
    e.preventDefault(),
    cb(e)
)