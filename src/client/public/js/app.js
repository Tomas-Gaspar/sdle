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

function isListPage() {
  return !!document.getElementById('is-list-page');
}

function logIfOnListPage() {
  setInterval(() => {
    if (isListPage()) {
      let listId = document.getElementById('lists').getAttribute('data-id');
      sendAjaxRequest('get', '/api/list', {"listId": listId}, updatedListHandler);
    }
  }, 1000);
}

function updatedListHandler() {
  console.log(this.status);
  if (this.status == 200) {
    const response = JSON.parse(this.response);
    
    console.log(response);
  } else {
    console.error("Error while updating list");
  }
}

async function getSvg(url) {
  const response = await fetch(url);
  return response.text();
}
  
function addEventListeners() {

    let toggleInternetBtn = document.getElementById('internet-btn');
    if (toggleInternetBtn) toggleInternetBtn.addEventListener('change', (event) => {toggleInternet(event)});

    let createListBtn = document.getElementById('create-btn');
    if (createListBtn) createListBtn.addEventListener('click', showCreateList);

    let createCheckListBtn = document.getElementById('create-check-btn');
    if (createCheckListBtn) createCheckListBtn.addEventListener('click', createList);

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

    let addItemBtn = document.getElementById('add-item-btn');
    if (addItemBtn) addItemBtn.addEventListener('click', showAddItem);

    let addCheckItemBtn = document.getElementById('add-item-check-btn');
    if (addCheckItemBtn) addCheckItemBtn.addEventListener('click', addItem);

    let deleteItemBtn = document.querySelectorAll('.del-item-btn');
    [].forEach.call(deleteItemBtn, function(btn) {
        btn.addEventListener('click', confirmItemDelete);
    });

    let increaseQuantityItemBtn = document.querySelectorAll('.inc-quant-btn');
    [].forEach.call(increaseQuantityItemBtn, function(btn) {
        btn.addEventListener('click', increaseItemQuantity);
    });

    let decreaseQuantityItemBtn = document.querySelectorAll('.dec-quant-btn');
    [].forEach.call(decreaseQuantityItemBtn, function(btn) {
        btn.addEventListener('click', decreaseItemQuantity);
    });

    let item = document.querySelectorAll('.shopping-item.list-item');
    [].forEach.call(item, function(i) {
        let quantity = i.querySelector('.quantity p').textContent;
        if (quantity === '0'){
          i.style.backgroundColor = '#F5F5F5';
          i.querySelector('p').style.textDecoration = 'line-through';
        }
    });
}

function toggleInternet(event) {
  if (event.target.checked) {
    sendAjaxRequest('post', '/api/internet', {internet: true}, turnInternetOnHandler);
  } else {
    sendAjaxRequest('post', '/api/internet', {internet: false}, turnInternetOffHandler);
  }
}

function turnInternetOnHandler() {
  internetBtn = document.getElementById('internet-btn');
  internetInput = internetBtn.querySelector('input');
  internetInput.setAttribute('data-id', true);
  console.log("Internet is turned ON");
}

function turnInternetOffHandler() {
  internetBtn = document.getElementById('internet-btn');
  internetInput = internetBtn.querySelector('input');
  internetInput.setAttribute('data-id', false);
  console.log("Internet is turned OFF");
}

function showCreateList() {
    let createListItem = document.getElementById('create-list');
    createListItem.classList.toggle('no-show');

    let downloadListItem = document.getElementById('download-list');
    if (!downloadListItem.classList.contains('no-show')) {
      downloadListItem.classList.toggle('no-show');
    }
}

function showAddItem() {
  let addItem = document.getElementById('add-item');
  addItem.classList.toggle('no-show');
}

function showDownloadList() {
  let downloadListItem = document.getElementById('download-list');
  downloadListItem.classList.toggle('no-show');

  let createListItem = document.getElementById('create-list');
  if (!createListItem.classList.contains('no-show')) {
    createListItem.classList.toggle('no-show');
  }
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

    let listContainer = document.querySelector('#lists ul');
    let otherLists = listContainer.querySelectorAll('li.shopping-list');
    if (otherLists.length === 0) {
      let newListItem = document.createElement('li');
      newListItem.id = 'no-list';
      newListItem.className = 'list-item';
      newListItem.innerHTML = `
        <p>You have yet to add any list to this device!</p>
        <p>Create a new list or download an existing one!</p>
      `;

      listContainer.appendChild(newListItem);
    }
  }
  else {
    console.error("Error while deleting list");
  }
}

function confirmItemDelete (event){
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
      deleteItem(event);
    }
  });
}

function deleteItem(event) {
  const listId = event.target.closest('section').getAttribute('data-id');
  const itemName = event.target.closest('li').querySelector('p').textContent;
  sendAjaxRequest('post', '/api/item/remove', {listId: listId, itemName: itemName}, deleteItemHandler);
}

function deleteItemHandler() {
  if (this.status == 200) {
    let item = document.querySelector(`li[data-id=${this.responseText}]`);
    item.remove();
    
    let listContainer = document.querySelector('#lists ul');
    let otherLists = listContainer.querySelectorAll('li.shopping-item');
    if (otherLists.length === 0) {
      let newListItem = document.createElement('li');
      newListItem.id = 'no-item';
      newListItem.className = 'list-item';
      newListItem.innerHTML = `
        <p>You have yet to add any items to this list!</p>
      `;

      listContainer.appendChild(newListItem);
    }
  }
  else {
    console.error("Error while deleting item");
  }
}

function createList(event) {
  event.preventDefault();
  const listName = document.querySelector('input[name="createList"]').value;
  if (listName !== '')
    sendAjaxRequest('post', '/api/create', {listName: listName}, createListHandler);
}

async function createListHandler() {
  if (this.status == 200) {
    const response = JSON.parse(this.response);

    let input = document.querySelector('input[name="createList"]');
    input.value = '';
    let inputListItem = input.closest('li');
    inputListItem.classList.toggle('no-show');

    let emptyMsg = document.querySelector('#no-list');
    if (emptyMsg) emptyMsg.remove();

    let newListItem = document.createElement('li');
    newListItem.className = 'shopping-list list-item';
    newListItem.setAttribute('data-id', response.id);

    const eyeSvg = await getSvg('../img/eye.svg');
    const copySvg = await getSvg('../img/copy.svg');
    const trashSvg = await getSvg('../img/trash.svg');

    newListItem.innerHTML = `
      <p>${response.title}</p>
      <div class="action-btns">
          <a href="${response.id}" class="icon view-btn" title="View list">${eyeSvg}</a>
          <button class="icon copy-btn" title="Copy list id">${copySvg}</button>
          <button class="icon del-btn" title="Delete list">${trashSvg}</button>
      </div>
    `;

    let ulElement = document.querySelector('#lists ul');
    ulElement.appendChild(newListItem);

    addEventListeners();
  }
  else {
    console.error("Error while creating list");
  }
}

  function addItem(event) {
    event.preventDefault();
    const listId = event.target.closest('section').getAttribute('data-id');
    const itemName = document.querySelector('input[name="addItem"]').value;
    if (itemName !== '')
      sendAjaxRequest('post', '/api/item/create', {listId: listId, itemName: itemName, itemQuantity: 1}, addItemHandler);
  }
  
  async function addItemHandler() {
    if (this.status == 200) {
      const response = JSON.parse(this.response);
  
      let input = document.querySelector('input[name="addItem"]');
      input.value = '';
      let inputListItem = input.closest('li');
      inputListItem.classList.toggle('no-show');

      let emptyMsg = document.querySelector('#no-item');
      if (emptyMsg) emptyMsg.remove();
  
      let newListItem = document.createElement('li');
      newListItem.className = 'shopping-item list-item';
      newListItem.setAttribute('data-id', response.name);

      const plusSvg = await getSvg('../img/plus.svg');
      const minusSvg = await getSvg('../img/minus.svg');
      const trashSvg = await getSvg('../img/trash.svg');
  
      newListItem.innerHTML = `
        <p>${response.name}</p>
        <div class="action-btns">
            <div class="quantity">
              <button class="icon inc-quant-btn" title="Increase quantity">${plusSvg}</button>
              <p>${response.quantity}</p>
              <button class="icon dec-quant-btn" title="Decrease quantity">${minusSvg}</button>
            </div>
            <button class="icon del-item-btn" title="Delete item">${trashSvg}</button>
        </div>
      `;
  
      let ulElement = document.querySelector('#lists ul');
      ulElement.appendChild(newListItem);
  
      addEventListeners();
    }
    else{
      console.error("Error while adding item to list");
    }
  }

  function increaseItemQuantity(event) {
    const listId = event.target.closest('section').getAttribute('data-id');
    const itemName = event.target.closest('li').querySelector('p').textContent;
    const quantity = event.target.closest('div').querySelector('p').textContent;
    sendAjaxRequest('post', '/api/item/increase', {listId: listId, itemName: itemName, itemQuantity: quantity}, increaseItemQuantityHadler);
  }
  
  function increaseItemQuantityHadler() {
    if (this.status == 200) {
      const response = JSON.parse(this.response);

      let item = document.querySelector(`li[data-id=${response.name}]`);
      const quantity = item.querySelector('.quantity p');
      quantity.textContent = response.quantity;

      if (response.quantity > 0){
        item.style.backgroundColor = '#FFFFFF';
        item.querySelector('p').style.textDecoration = 'none';
      }
    }
    else {
      console.error("Error while increasing item quantity");
    }
  }

  function decreaseItemQuantity(event) {
    const listId = event.target.closest('section').getAttribute('data-id');
    const itemName = event.target.closest('li').querySelector('p').textContent;
    const quantity = event.target.closest('div').querySelector('p').textContent;
    if (quantity > 0) sendAjaxRequest('post', '/api/item/decrease', {listId: listId, itemName: itemName, itemQuantity: quantity}, decreaseItemQuantityHadler);
  }
  
  function decreaseItemQuantityHadler() {
    if (this.status == 200) {
      const response = JSON.parse(this.response);

      let item = document.querySelector(`li[data-id=${response.name}]`);
      const quantity = item.querySelector('.quantity p');
      quantity.textContent = response.quantity;

      if (response.quantity === 0){
        item.style.backgroundColor = '#F5F5F5';
        item.querySelector('p').style.textDecoration = 'line-through';
      }
    }
    else {
      console.error("Error while increasing item quantity");
    }
  }

document.addEventListener('DOMContentLoaded', () => {
  addEventListeners();
  logIfOnListPage();
});

addEventListeners();