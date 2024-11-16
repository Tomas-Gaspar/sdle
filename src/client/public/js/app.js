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
    console.log("Deleting list with id: " + listId);
}

addEventListeners();