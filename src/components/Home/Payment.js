

import React ,{useState,useEffect}from 'react'
import './Payment.css';
import CurrencyFormat from "react-currency-format";
import { getBasketTotal } from "./reducer";
import { useStateValue } from './StateProvider';
import { Link } from 'react-router-dom';
import CheckoutProduct from './CheckoutProduct';
import {cardElement,useStripe,useElements, CardElement} from '@stripe/react-stripe-js';
import axios from '../Home/axios';
import { useNavigate } from 'react-router-dom';

import {db} from '../../firebase'
function Payment() {
    const [{ basket,user }, dispatch] = useStateValue();
    const navigate=useNavigate();

    const [processing, setProcessing] = useState("");
    const [succeeded, setSucceeded] = useState(false);
    const[error,seterror]=useState(null);
    const[disabled,setdisabled]=useState(true);
    const [clientSecret, setClientSecret] = useState(true);

    const stripe= useStripe();
    const elements=useElements();

    useEffect(() => {
        // generate the special stripe secret which allows us to charge a customer
        const getClientSecret = async () => {
            const response = await axios({
                method: 'post',
                // Stripe expects the total in a currencies subunits
                url: `/payments/create?total=${getBasketTotal(basket) * 100}`
            });
            setClientSecret(response.data.clientSecret)
        }

        getClientSecret();
    }, [basket])
    console.log('THE SECRET IS >>>', clientSecret)
    console.log('👱', user)
    const handleSubmit=async (event) => {
        // do all the fancy stripe stuff...
        event.preventDefault();
        setProcessing(true);

        const payload = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
                card: elements.getElement(CardElement)
            }
        }).then(({ paymentIntent }) => {
            // paymentIntent = payment confirmation

            db
              .collection('users')
              .doc(user?.uid)
              .collection('orders')
              .doc(paymentIntent.id)
              .set({
                  basket: basket,
                  amount: paymentIntent.amount,
                  created: paymentIntent.created
              })

            setSucceeded(true);
            seterror(null)
            setProcessing(false)

            dispatch({
                type: 'EMPTY_BASKET'
            })

            navigate('/orders',{replace:true})
        })

    }
    const handleChange=(e)=>{
        setdisabled(e.empty);
        seterror(e.error?e.error.message:"");

    }
    return (
        <div className='payment'>
            <div className="payment__container">
                <h3>
                    Checkout{<Link to='/checkout'>{basket?.length} items</Link>}
                </h3>
                <div className="payment__section">
                    <div className="payment__title">
                        <h3>Dilivery Address</h3>
                    </div>
                    <div className="payment__address">
                        <p>{user?.email}</p>
                        <p>123 line</p>
                        <p>Banglore</p>
                    </div>


                </div>

                <div className="payment__section">
                    <div className="payment__title">
                        <h3>Review Item and delivery</h3>

                    </div>
                    <div className="payment__items">
                        {basket.map(item=>{
                            <CheckoutProduct 
                            id={item.id}
                            image={item.image}
                            price={item.price}
                            />
                        })}
                    </div>

                </div>

                <div className="payment__section">
                    <div className="payment__title">
                        <h3>Payment Method</h3>
                    </div>
                    <div className="payment__details">

                        <form onSubmit={handleSubmit}>
                            <CardElement onChange={handleChange}/>  
                            <div className='payment__priceContainer'>
                                    <CurrencyFormat
                                        renderText={(value) => (
                                            <h3>Order Total: {value}</h3>
                                        )}
                                        decimalScale={2}
                                        value={getBasketTotal(basket)}
                                        displayType={"text"}
                                        thousandSeparator={true}
                                        prefix={"$"}
                                    />
                                    <button disabled={processing || disabled || succeeded}>
                                        <span>{processing ? <p>Processing</p> : "Buy Now"}</span>
                                    </button>
                                </div>

                                  {/* Errors */}
                                {error && <div>{error}</div>}

                        </form> 


                    </div>

                </div>
            </div>

        </div>
    )
}

export default Payment
