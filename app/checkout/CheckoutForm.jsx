'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { placeOrder } from './actions';
import { money, thumb } from '@/lib/format';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn--signal btn--block btn--lg" type="submit" disabled={pending}>
      {pending ? 'Placing order…' : 'Place order'}
    </button>
  );
}

export default function CheckoutForm({ summary: s, states, shipping, notice }) {
  const [state, action] = useActionState(placeOrder, { errors: [], values: {} });
  const v = state.values || {};
  const [method, setMethod] = useState(v.shipping_method || 'express');
  const errRef = useRef(null);

  useEffect(() => { if (state.errors?.length) errRef.current?.focus(); }, [state]);

  const expressCost = s.freeExpress ? 0 : shipping.methods.express.cost;
  const shipCost = method === 'express' ? expressCost : shipping.methods.standard.cost;
  const total = s.subtotal - s.discount + shipCost;

  // key forces inputs to pick up returned values after a failed submit
  const k = state.at || 0;

  return (
    <>
      {state.errors?.length > 0 && (
        <div className="notice notice--error" role="alert" tabIndex={-1} ref={errRef}>
          <p><strong>Please fix the following:</strong></p>
          <ul>{state.errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}

      <form className="flow__grid checkout" action={action} noValidate key={k}>
        <div className="checkout__main">
          <fieldset className="panel">
            <legend className="panel__title"><span className="step">1</span> Contact</legend>
            <div className="field-row">
              <div className="field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" required defaultValue={v.email} /></div>
              <div className="field"><label htmlFor="phone">Phone</label><input id="phone" name="phone" type="tel" autoComplete="tel" required defaultValue={v.phone} /></div>
            </div>
          </fieldset>

          <fieldset className="panel">
            <legend className="panel__title"><span className="step">2</span> Shipping address</legend>
            <div className="field-row">
              <div className="field"><label htmlFor="first_name">First name</label><input id="first_name" name="first_name" autoComplete="given-name" required defaultValue={v.first_name} /></div>
              <div className="field"><label htmlFor="last_name">Last name</label><input id="last_name" name="last_name" autoComplete="family-name" required defaultValue={v.last_name} /></div>
            </div>
            <div className="field"><label htmlFor="address_1">Street address</label><input id="address_1" name="address_1" autoComplete="address-line1" required defaultValue={v.address_1} /></div>
            <div className="field"><label htmlFor="address_2">Apartment, suite, etc. <span className="opt">(optional)</span></label><input id="address_2" name="address_2" autoComplete="address-line2" defaultValue={v.address_2} /></div>
            <div className="field-row field-row--3">
              <div className="field"><label htmlFor="city">Suburb</label><input id="city" name="city" autoComplete="address-level2" required defaultValue={v.city} /></div>
              <div className="field">
                <label htmlFor="state">State</label>
                <select id="state" name="state" autoComplete="address-level1" required defaultValue={v.state || ''}>
                  <option value="">Select…</option>
                  {states.map((st) => <option key={st} value={st}>{st}</option>)}
                </select>
              </div>
              <div className="field"><label htmlFor="postcode">Postcode</label><input id="postcode" name="postcode" inputMode="numeric" pattern="\d{4}" maxLength={4} autoComplete="postal-code" required defaultValue={v.postcode} /></div>
            </div>
            <p className="field-hint">We ship to Australian addresses only.</p>
          </fieldset>

          <fieldset className="panel">
            <legend className="panel__title"><span className="step">3</span> Delivery</legend>
            <div className="options">
              <label className="option">
                <input type="radio" name="shipping_method" value="express" checked={method === 'express'} onChange={() => setMethod('express')} />
                <span className="option__body"><strong>Express Shipping</strong><small>{shipping.methods.express.eta} · not available to PO Boxes</small></span>
                <span className="option__price">{expressCost ? money(expressCost) : 'FREE'}</span>
              </label>
              <label className="option">
                <input type="radio" name="shipping_method" value="standard" checked={method === 'standard'} onChange={() => setMethod('standard')} />
                <span className="option__body"><strong>Standard Shipping</strong><small>{shipping.methods.standard.eta}</small></span>
                <span className="option__price">{money(shipping.methods.standard.cost)}</span>
              </label>
            </div>
          </fieldset>

          <fieldset className="panel">
            <legend className="panel__title"><span className="step">4</span> Payment</legend>
            <div className="options">
              <label className="option option--static">
                <input type="radio" name="payment_method" value="bank" defaultChecked />
                <span className="option__body"><strong>Bank transfer</strong><small>Save 10%. Transfer details are shown after you place your order and emailed to you; we dispatch once payment clears.</small></span>
                <span className="option__price option__price--signal">−10%</span>
              </label>
            </div>
            <div className="field">
              <label htmlFor="notes">Order notes <span className="opt">(optional)</span></label>
              <textarea id="notes" name="notes" rows={3} maxLength={1000} defaultValue={v.notes} />
            </div>
            <label className="check">
              <input type="checkbox" name="terms" value="on" required defaultChecked={!!v.terms} />
              <span>I have read and agree to the <a href="/terms-and-conditions/" target="_blank" rel="noopener">terms and conditions</a>, and confirm these products are for laboratory research use only.</span>
            </label>
          </fieldset>
        </div>

        <aside className="summary checkout__summary" aria-label="Order summary">
          <h2 className="h3">Order summary</h2>
          <ul className="mini-lines">
            {s.lines.map((l) => (
              <li key={l.slug}>
                <img src={thumb(l.image)} alt="" width="48" height="48" />
                <span className="mini-lines__qty">{l.qty}</span>
                <span className="mini-lines__name">{l.name}</span>
                <span>{money(l.total)}</span>
              </li>
            ))}
          </ul>
          <dl className="totals">
            <div><dt>Subtotal</dt><dd>{money(s.subtotal)}</dd></div>
            <div className="totals__signal"><dt>Bank transfer discount</dt><dd>−{money(s.discount)}</dd></div>
            <div><dt>Shipping</dt><dd data-ship-cost>{shipCost ? money(shipCost) : 'FREE'}</dd></div>
            <div className="totals__grand"><dt>Total</dt><dd data-grand>{money(total)}</dd></div>
            <div className="totals__gst"><dt>Includes GST</dt><dd data-gst>{money(Math.round(total / 11))}</dd></div>
          </dl>
          <SubmitButton />
          <p className="summary__fine">{notice}</p>
        </aside>
      </form>
    </>
  );
}
