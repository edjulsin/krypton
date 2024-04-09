export default function getOffsetParent(ref) {
    if('offsetParent' in ref) {
        return ref.offsetParent
    } else {
        return getOffsetParent(ref.parentElement) || null
    }
}