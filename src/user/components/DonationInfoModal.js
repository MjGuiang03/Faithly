import React from 'react';
import { X, Copy, Check } from 'lucide-react';
import '../styles/DonationInfoModal.css';

// You might need to adjust the path to your gcash QR code if you have one
import gcashQr from '../../assets/gcash_qr.png';

export default function DonationInfoModal({ isOpen, onClose }) {
  const [copiedField, setCopiedField] = React.useState('');

  if (!isOpen) return null;

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 2000);
  };

  return (
    <div className="donation-modal-overlay">
      <div className="donation-modal-content">
        <button className="donation-modal-close" onClick={onClose}>
          <X size={24} />
        </button>

        <div className="donation-modal-header">
          <h2>Give Offering</h2>
          <p>Thank you for your generosity. Choose a method below to send your donation.</p>
        </div>

        <div className="donation-methods-container">
          {/* GCash */}
          <div className="donation-method-card">
            <div className="donation-method-header gcash">
              <h3>GCash</h3>
            </div>
            <div className="donation-method-body">
              {gcashQr && <img src={gcashQr} alt="GCash QR" className="donation-qr" />}
              <div className="donation-details">
                <div className="detail-row">
                  <span className="detail-label">Name:</span>
                  <span className="detail-value">PUAC Church</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Number:</span>
                  <span className="detail-value">0912 345 6789</span>
                  <button 
                    className="copy-btn" 
                    onClick={() => handleCopy('09123456789', 'gcash')}
                    title="Copy GCash Number"
                  >
                    {copiedField === 'gcash' ? <Check size={16} color="green" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Maya */}
          <div className="donation-method-card">
            <div className="donation-method-header maya">
              <h3>Maya</h3>
            </div>
            <div className="donation-method-body">
              <div className="donation-details">
                <div className="detail-row">
                  <span className="detail-label">Name:</span>
                  <span className="detail-value">PUAC Church</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Number:</span>
                  <span className="detail-value">0998 765 4321</span>
                  <button 
                    className="copy-btn" 
                    onClick={() => handleCopy('09987654321', 'maya')}
                    title="Copy Maya Number"
                  >
                    {copiedField === 'maya' ? <Check size={16} color="green" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bank Transfer */}
          <div className="donation-method-card">
            <div className="donation-method-header bank">
              <h3>Bank Transfer</h3>
            </div>
            <div className="donation-method-body">
              <div className="donation-details">
                <div className="detail-row">
                  <span className="detail-label">Bank:</span>
                  <span className="detail-value">BDO Unibank</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Account Name:</span>
                  <span className="detail-value">Philippine United Apostolic Church</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Account Number:</span>
                  <span className="detail-value">0012 3456 7890</span>
                  <button 
                    className="copy-btn" 
                    onClick={() => handleCopy('001234567890', 'bank')}
                    title="Copy Account Number"
                  >
                    {copiedField === 'bank' ? <Check size={16} color="green" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
