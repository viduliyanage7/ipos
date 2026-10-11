import React from 'react'
import CustomerSearch from '../Steps/CustomerSearch';
import { useState } from 'react';
import Products from '../Steps/Products';
import Summary from '../Steps/summary';

const CreateBillSteps = (props) => {
    const {userId,setToast,currentStep,setCurrentStep} = props;
    const [cart, setCart] = useState([])
    const [customer, setCustomer] = useState([])
    const nextStep = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        }else{
            setCurrentStep(0);
        }
    };
    
    const previousStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };
    const steps = [
        { component: <CustomerSearch nextStep={nextStep} setCustomer={setCustomer} /> },
        { component: <Products setCart={setCart} cart={cart} nextStep={nextStep} setToast={setToast}/> },
        { component: <Summary setToast={setToast} cart={cart} nextStep={nextStep} customer={customer} userId={userId}/> },
    ];
    return (
        <div className='w-full h-full'>
            {steps[currentStep].component}
        </div>
    )
}

export default CreateBillSteps