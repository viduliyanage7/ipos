import React, { useEffect, useRef, useState } from 'react'
import axios from 'axios'


const Inventory = () => {

  const [categories, setCategories] = useState([])
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState(null)

  const [modalQty, setModalQty] = useState(1)
  const inputRef = useRef(null)

  const openModal = (product) => { setModal({ product }); setModalQty(1) }
  const closeModal = () => { setModal(null); setModalQty(1) }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2200)
  }


  const handleModalKeyDown = (e) => {
    if (e.key === 'Enter') confirmAdd()
    if (e.key === 'Escape') closeModal()
  }

  const confirmAdd = async () => {
    if (!modal) return
    const { product } = modal
    const qty = Math.max(1, parseInt(modalQty) || 1)

    const response = await axios.post('http://localhost:3002/api/inventory/add', {
      product_id: product.id,
      quantity: qty
    })

    if (response.status === 200) {
      showToast(`${product.productName} × ${qty} added`)
    } else {
      showToast(`Failed to add ${product.productName}`)
    }

    fetchData()
    closeModal()
  }

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    if (modal && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [modal])

  const fetchData = async () => {
    try {
      const response = await axios.get('http://localhost:3002/api/create-bill/products')
      setCategories(response.data.data)
    } catch (err) {
      console.error('Failed to fetch products:', err)
    }
  }

  const allProducts = categories.flatMap((cat) => {
    const ids = cat.productIds.split(',')
    const names = cat.productNames.split(',')
    const stocks = cat.productStock ? cat.productStock.split(',') : []

    return names.map((name, idx) => ({
      id: `${ids[idx]}`,
      productName: name.trim(),
      category_id: cat.category_id,
      category_name: cat.category_name,
      stock: parseInt(stocks[idx]) || 0,
      price: undefined,
    }))
  })

  const filtered = allProducts.filter((p) =>
    p.productName.toLowerCase().includes(search.toLowerCase())
  )


  const grouped = filtered.reduce((acc, product) => {
    if (!acc[product.category_name]) acc[product.category_name] = []
    acc[product.category_name].push(product)
    return acc
  }, {})

  const handleProductClick = (product) => {
    openModal(product)
  }
  return (
    <div className="w-full min-h-screen bg-slate-50 font-sans">

      <div className="sticky top-0 z-50 bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <svg
            className="w-5 h-5 text-slate-700"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 7l9-4 9 4M3 7v10l9 4m-9-14l9 4m9-4l-9 4m9-4v10l-9 4m0-10v10"
            />
          </svg>
          <span className="font-semibold text-slate-900 text-base">Inventory</span>
        </div>
      </div>

      <div className="mt-10 px-6 pb-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-1 gap-3.5 items-start">
        {Object.entries(grouped).length === 0 ? (
          <div className="col-span-full text-center text-slate-400 text-sm pt-12">
            No products found.
          </div>
        ) : (
          Object.entries(grouped).map(([catName, products]) => (
            <div key={catName} className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-[13px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                {catName}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {products.map((product) => {
                  // const selected = isInCart(product.id)
                  const lowStock = product.stock > 0 && product.stock <= 5

                  return (
                    <button
                      key={product.id}
                      onClick={() => handleProductClick(product)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer
                          bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-100`}
                    >
                      {product.productName}
                      {lowStock && (
                        <span className="ml-1 text-[12px] text-[#ff0000] font-semibold">
                          {product.stock} left
                        </span>
                      )}
                      {!lowStock && (
                        <span className="ml-1 text-[10px] text-amber-500 font-semibold">
                          {product.stock} left
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {modal && (
        <>
          <div
            onClick={closeModal}
            className="fixed inset-0 bg-black/45 z-[200]"
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl w-80 z-[201] overflow-hidden shadow-2xl">
            <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">{modal.product.productName}</p>
                <p className="text-xs text-slate-400 mt-0.5">{modal.product.category_name}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {modal.product.stock} in stock
                </p>
              </div>
              <button
                onClick={closeModal}
                className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-100 text-slate-500 hover:bg-slate-200 transition cursor-pointer text-base border-none"
              >×</button>
            </div>

            <div className="p-5">
              <p className="text-xs font-medium text-slate-500 mb-2.5">Quantity</p>

              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50 mb-4">
                <button
                  onClick={() => setModalQty((q) => Math.max(1, q - 1))}
                  className="flex-1 h-12 flex items-center justify-center text-xl text-slate-500 border-r border-slate-200 bg-transparent hover:bg-slate-100 transition cursor-pointer border-none"
                >−</button>
                <input
                  ref={inputRef}
                  type="number"
                  value={modalQty}
                  min={1}
                  max={modal.product.stock}
                  onChange={(e) => setModalQty(Math.max(1, parseInt(e.target.value) || 1))}
                  onKeyDown={handleModalKeyDown}
                  className="w-[200px] flex-[2] h-12 text-center text-xl font-bold text-slate-900 bg-white border-none outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  onClick={() => setModalQty((q) => Math.min(modal.product.stock, q + 1))}
                  className="flex-1 h-12 flex items-center justify-center text-xl text-slate-500 border-l border-slate-200 bg-transparent hover:bg-slate-100 transition cursor-pointer border-none"
                >+</button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={closeModal}
                  className="flex-1 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-500 text-sm font-medium hover:bg-slate-50 transition cursor-pointer"
                >Cancel</button>
                <button
                  onClick={confirmAdd}
                  className="flex-[2] py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-slate-800 transition cursor-pointer border-none"
                >
                  {/* <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 001.99 1.61H19a2 2 0 001.99-1.73L22 6H6" />
                  </svg> */}
                  Save
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-medium px-4 py-2 rounded-lg z-[300] whitespace-nowrap shadow-lg">
          {toast}
        </div>
      )}

    </div>
  )
}

export default Inventory