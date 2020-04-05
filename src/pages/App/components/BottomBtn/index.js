/**
 * 底部按钮
 * @author ainuo5213
 * @date 2020-02-16
 */

import React from 'react'
import PropTypes from 'prop-types'
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome'

const Index = ({text, color, icon, onClick}) => {
    return (
        <button
            type={'button'}
            className={`btn btn-block no-border ${color}`}
            onClick={onClick}
        >
            <FontAwesomeIcon
                icon={icon}
            />
            {text}
        </button>
    )
};

Index.propTypes = {
    text: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired,
    icon: PropTypes.object.isRequired,
    onClick: PropTypes.func
};

export default Index
