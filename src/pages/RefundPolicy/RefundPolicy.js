import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BsArrowLeft } from 'react-icons/bs';
import './RefundPolicy.css';

const RefundPolicy = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="policy-page">
            <div className="container">
                <div className="breadcrumb-container">
                    <Link to="/shop" className="breadcrumb-link">
                        <BsArrowLeft /> Back to Shop
                    </Link>
                </div>
                <div className="policy-container">
                    <h1 className="policy-title">Refund & Return Policy</h1>
                    <div className="policy-content">
                        <p className="intro-text">
                            Once your order is confirmed, we are more than happy to work with our patrons to find an amicable solution that is fair to all parties.
                        </p>

                        <section>
                            <h2>In case of Damaged product</h2>
                            <p>
                                Satva Organics needs to be notified of damaged product within <strong>2 days</strong> from delivery date via email to <strong className="email-link">info.satvaorganics@gmail.com</strong>
                            </p>
                            <p>
                                In the email, please include:
                            </p>
                            <ul>
                                <li>Order number</li>
                                <li>Image of invoice</li>
                                <li>1 outer box image</li>
                                <li>2 clear images of damaged product</li>
                            </ul>
                            <p>
                                In case of multiple item shipments, only the affected product can be returned and replaced. We will be happy to re-send and replace the product(s) promptly.
                            </p>
                        </section>

                        <section>
                            <h2>Return Process</h2>
                            <p>
                                At Satva Organics we try to deliver perfectly each and every time. But in the off-chance that you need to return the item, please do so with the <strong>original Brand box/price tag, original packing and invoice</strong> without which it will be really difficult for us to act on your request. Please help us in helping you. Terms and conditions apply.
                            </p>
                            <p>
                                The goods sold as are intended for end user consumption and not for re-sale.
                            </p>
                        </section>

                        <section>
                            <h2>In case of spoiled product</h2>
                            <p>
                                Satva Organics needs to be notified of spoilage of product within <strong>2 days</strong> from delivery date via email to <strong className="email-link">info.satvaorganics@gmail.com</strong>
                            </p>
                            <p>
                                In the email, please include:
                            </p>
                            <ul>
                                <li>Order number</li>
                                <li>Date of packaging/ date of manufacture</li>
                                <li>Clear images or video of the product</li>
                            </ul>
                            <p>
                                We will be unable to accept returns due to variance in taste, texture, colour or aroma. This is because our products are completely natural and made mostly by hand so no two batches will be identical. No compromise is made in the natural production process, use of best and natural ingredients and we will ensure that maximum nutritional value is retained.
                            </p>
                            <p>
                                We will work with you on providing an amicable solution. Product will be replaced after due investigation and diligence and we assure a fair outcome at all times. Email will be responded to within 24-48 hrs.
                            </p>
                        </section>

                        <section>
                            <h2>Refund Process</h2>
                            <p>
                                Refunds will be processed via the original payment method within <strong>7–10 business days</strong> after we receive the returned product.
                            </p>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RefundPolicy;
