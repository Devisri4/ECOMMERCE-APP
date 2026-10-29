import React from 'react';
import axios from 'axios'
import { backendUrl } from '../App';
import { toast } from 'react-toastify';
import { friendlyError } from '../utils/messages';
import ProductForm from '../components/ProductForm';

const Add = ({token, demo = false})=>{

  // Same request as before: multipart with image1–image4 and the product fields
  const onSubmit = async ({ name, description, price, category, subCategory, bestseller, sizes, slots, stock }) => {
    try {
      const formData = new FormData()

      formData.append("name", name)
      formData.append("description", description)
      formData.append("price", price)
      formData.append("category", category)
      formData.append("subCategory", subCategory)
      formData.append("bestseller", bestseller)
      formData.append("sizes", JSON.stringify(sizes))
      formData.append("stock", JSON.stringify(stock))
      slots.forEach((slot, i) => slot.file && formData.append(`image${i + 1}`, slot.file))

      const response = await axios.post(backendUrl + "/api/product/add",formData,{headers:{token}})
      if(response.data.success) {
        toast.success("Product added.")
        return true
      }
      toast.error(friendlyError(response.data.message, "Couldn’t add the product. Please try again."))
      return false
    } catch (error) {
        console.log(error);
        toast.error(friendlyError(error, "Couldn’t add the product. Please try again."))
        return false
    }
  }

  return (
    <ProductForm
      title='Add product'
      subtitle='New products appear in the store immediately.'
      submitLabel='Add product'
      submittingLabel='Adding product…'
      onSubmit={onSubmit}
      resetOnSuccess
      readOnly={demo}
    />
  )
}

export default Add
