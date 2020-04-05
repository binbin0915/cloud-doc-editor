/**
 * 模态提示框
 * @author Sun Yonggang
 * @date 2020-02-20
 */
import React from 'react';
import PropTypes from 'prop-types'
import './modal.css'

const Modal = ({title, message, onLabel1Click, onLabel2Click, onLabel3Click, active, id, label}) => {
    return (
        <React.Fragment>
            <div className={"modal-layer " + (active ? 'active' : '')}/>
            <div className={'modal-container ' + (active ? 'active' : '')}>
                <div className="modal-header">
                    <h5 className={'modal-title text'}>{title}</h5>
                </div>
                <div className="modal-body">
                    <p className={'text'}>{message}</p>
                </div>
                <div className="modal-footer">
                    <button
                        type={'button'}
                        onClick={() => onLabel1Click(id)}
                        className="btn btn-primary">
                        <span className={'text'}>{label.label1}</span>
                    </button>
                    <button
                        type={'button'}
                        onClick={onLabel2Click}
                        className="btn btn-secondary">
                        <span className={'text'}>{label.label2}</span>
                    </button>
                    {
                        label.label3 && <button
                            type={'button'}
                            onClick={onLabel3Click}
                            className="btn btn-secondary">
                            <span>{label.label3}</span>
                        </button>
                    }
                </div>
            </div>
        </React.Fragment>
    )
};

Modal.propTypes = {
    title: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
    onSuccess: PropTypes.func,
    onCanceled: PropTypes.func,
    active: PropTypes.bool,
    id: PropTypes.string,
    label: PropTypes.object.isRequired
};

export default Modal
