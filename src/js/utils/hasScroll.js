export default function hasScroll({
    scrollWidth,
    scrollHeight,
    clientWidth,
    clientHeight
}) {
    return scrollWidth > clientWidth || scrollHeight > clientHeight
}
