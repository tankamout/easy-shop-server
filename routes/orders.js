// const Order=require('../models/order')
const express=require('express')
const { Order } = require('../models/order')
const { OrderItem } = require('../models/order-item')
const router=express.Router()

router.get(`/`,async (req,res)=>{
    const orderList=await Order.find().populate('user','name').sort({'dateOrdered':-1})
    if(!orderList){
        res.status(500).json({success:false})
    }
    res.send(orderList)
    // res.send('hello api !')
})

router.get(`/:id`,async (req,res)=>{
    const orderList=await Order.findById(req.params.id).populate('user','name').populate({path:'orderItems',populate:{path:'product',populate:'category' } })
    if(!orderList){
        res.status(500).json({success:false})
    }
    res.send(orderList)
    // res.send('hello api !')
})

router.post(`/`,async (req,res)=>{
    const orderItemsIds=Promise.all( req.body.orderItems.map(async orderitem=>{
        let newOrderItem=new OrderItem({
            quantity:orderitem.quantity,
            product:orderitem.product,
        })

        newOrderItem=await newOrderItem.save()
        return newOrderItem._id
    }))
    const orderItemsIdsResolved=await orderItemsIds
    const totalPrices=await Promise.all(orderItemsIdsResolved.map(async (orderItemId)=>{
        const orderItem=await OrderItem.findById(orderItemId).populate('product','price')
        const totalPrice=orderItem.product.price*orderItem.quantity
        return totalPrice
    }))

    const totalPrice=totalPrices.reduce((a,b)=>a+b,0)


   let order=new Order({
       orderItems:orderItemsIdsResolved,
       shippingAddress1:req.body.shippingAddress1,
       shippingAddress2:req.body.shippingAddress2,
       city:req.body.city,
       zip:req.body.zip,
       country:req.body.country,
       phone:req.body.phone,
       status:req.body.status,
       totalPrice:totalPrice,
       user:req.body.user, 
   })

   order=await order.save()

   if(!order){
       return res.status(404).send("something wrong!")
   }

   res.send(order)
})


router.put(`/:id`,async (req,res)=>{
    
   const  order=await  Order.findByIdAndUpdate(
       req.params.id,{
           status:req.body.status
       },
    {
      new:true 
   })


   if(!order){
       return res.status(404).send("something wrong!")
   }

   res.send(order)
})


router.delete('/:id',(req,res)=>{
    Order.findByIdAndRemove(req.params.id).then(async order=>{
        if(order){
            await order.orderItems.map(async orderItems=>{
                await OrderItem.findByIdAndRemove(orderItems)
            })
            return res.status(200).json({success:true,message:'delete like v bro yay'})
        }else{
            return res.status(404).json({success:false,message:"ma twae buu tk"})
        }

    }).catch(err=>{
        return res.status(400).json({success:false,error:err})
    })
})

router.get('/get/totalsales',async (req,res)=>{
    const totalSales=await Order.aggregate([
        {$group:{_id:null,totalsales:{$sum:'$totalPrice'}}}
    ])
    if(!totalSales){
        return res.status(400).send('The order sales not generate')
    }
    res.send({totalsales:totalSales.pop().totalsales })
})

router.get('/get/count',async(req,res)=>{
    const orederCount=await Order.countDocuments()
    if(!orederCount){
        res.status(500).json({success:false})
    }
    res.send({
        orederCount:orederCount
    })
 })

 router.get(`/get/userorders/:userid`,async (req,res)=>{
    const userorderList=await Order.find({usre:req.params.userid}).populate({path:'orderItems',populate:{path:'product',populate:'category' } }).sort({'dateOrdered':-1})
    if(!userorderList){
        res.status(500).json({success:false})
    }
    res.send(userorderList)
    // res.send('hello api !')
})

module.exports=router