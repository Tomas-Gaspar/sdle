function addEventListeners() {

    let copyListBtn = document.querySelectorAll('.copy-btn');
    [].forEach.call(copyListBtn, function(btn) {
        btn.addEventListener('click', copyList);
    });
}

function copyList(event) {
    const listId = event.target.closest('li').getAttribute('data-id');
    navigator.clipboard.writeText(listId);
}

addEventListeners();