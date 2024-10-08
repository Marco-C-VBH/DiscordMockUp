
// focus/blur on channel header click
$(".channels-header")[0].addEventListener("click", e => {
    e.preventDefault();
    const focused = document.activeElement === e.target;
    focused ? e.target.blur() : e.target.focus();
});