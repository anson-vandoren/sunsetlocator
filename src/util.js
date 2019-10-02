function setInputDate(el, date) {
  if (el) {
    el.value = date.toFormat("yyyy-MM-dd");
  }
}
