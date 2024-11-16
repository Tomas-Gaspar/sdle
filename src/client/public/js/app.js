function encodeForAjax(data) {
  if (data == null) return null;
  return Object.keys(data).map(function(k){
    return encodeURIComponent(k) + '=' + encodeURIComponent(data[k])
  }).join('&');
}
  
function sendAjaxRequest(method, url, data, handler) {
  let request = new XMLHttpRequest();

  request.open(method, url, true);
  // request.setRequestHeader('X-CSRF-TOKEN', document.querySelector('meta[name="csrf-token"]').content);
  request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
  request.addEventListener('load', handler);
  request.send(encodeForAjax(data));
}
  
function addEventListeners() {

    let createListBtn = document.getElementById('create-btn');
    if (createListBtn) createListBtn.addEventListener('click', showCreateList);

    let downloadListBtn = document.getElementById('download-btn');
    if (downloadListBtn) downloadListBtn.addEventListener('click', showDownloadList);

    let copyListBtn = document.querySelectorAll('.copy-btn');
    [].forEach.call(copyListBtn, function(btn) {
        btn.addEventListener('click', copyList);
    });

    let deleteListBtn = document.querySelectorAll('.del-btn');
    [].forEach.call(deleteListBtn, function(btn) {
        btn.addEventListener('click', confirmDelete);
    });
}

function showCreateList() {
    let createListItem = document.getElementById('create-list');
    createListItem.classList.toggle('no-show');
}

function showDownloadList() {
  let downloadListItem = document.getElementById('download-list');
  downloadListItem.classList.toggle('no-show');
}

function copyList(event) {
    const listId = event.target.closest('li').getAttribute('data-id');
    navigator.clipboard.writeText(listId);
}

function confirmDelete (event){
    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#304700",
      cancelButtonColor: "#C2C2C2",
      confirmButtonText: "Yes"
    }).then((result) => {
      if (result.isConfirmed) {
        deleteList(event);
      }
    });
}

function deleteList(event) {
  const listId = event.target.closest('li').getAttribute('data-id');
  sendAjaxRequest('post', '/api/remove', {listId: listId}, deleteListHandler);
}

function deleteListHandler() {
  if (this.status == 200) {
    let list = document.querySelector(`li[data-id=${this.responseText}]`);
    list.remove();
  }
}

addEventListeners();