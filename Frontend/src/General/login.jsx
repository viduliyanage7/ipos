import React from 'react';
import { Form, Input, message } from 'antd';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';

const MyFormItemContext = React.createContext([]);

function toArr(str) {
    return Array.isArray(str) ? str : [str];
}

const MyFormItem = ({ name, ...props }) => {
    const prefixPath = React.useContext(MyFormItemContext);
    const concatName = name !== undefined ? [...prefixPath, ...toArr(name)] : undefined;
    return <Form.Item name={concatName} {...props} />;
};

const Login = (props) => {
    const { setAllinput, setUserId } = props;
    const [messageApi, contextHolder] = message.useMessage();
    const navigate = useNavigate();

    const onFinish = async (value) => {
        try {
            const response = await axios.post(`http://localhost:3002/api/login`, value);
            if (response.data.success === true) {
                setUserId(response.data.user.id);
                navigate('/home');
            } else {
                showError();
            }
            
        } catch (error) {
            showError();
        }
    };

    const handleKeyDown = (e, nextFieldId) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const nextField = document.getElementById(nextFieldId);
            if (nextField) nextField.focus();
        }
    };

    const showError = () => {
        messageApi.open({
            type: 'error',
            content: 'Incorrect username or password',
        });
    };

    return (
        <div className="flex min-h-screen w-full">
            {contextHolder}

            {/* Left panel */}
            <div className="flex w-1/2 flex-col items-center justify-center bg-white px-16 py-12">
                {/* Logo */}
                <div className="mb-10 flex flex-col items-center gap-3">
                    <img
                        src="./logo.png"
                        alt="Logo"
                        className="h-20 w-auto object-contain"
                    />
                </div>

                {/* Heading */}
                <div className="mb-8 w-full max-w-sm">
                    <h1 className="text-2xl font-semibold text-gray-800">Welcome back</h1>
                    <p className="mt-1 text-sm text-gray-500">Sign in to your account to continue</p>
                </div>

                {/* Form */}
                <Form
                    name="login_form"
                    layout="vertical"
                    onFinish={onFinish}
                    className="w-full max-w-sm"
                >
                    <MyFormItem
                        label={<span className="text-sm font-medium text-gray-700">Username</span>}
                        name="username"
                        rules={[{ required: true, message: 'Please enter your username' }]}
                    >
                        <Input
                            onKeyDown={(e) => handleKeyDown(e, 'password')}
                            className="h-12 rounded-lg border-gray-300 text-sm"
                            placeholder="Enter your username"
                        />
                    </MyFormItem>

                    <MyFormItem
                        label={<span className="text-sm font-medium text-gray-700">Password</span>}
                        name="password"
                        rules={[{ required: true, message: 'Please enter your password' }]}
                    >
                        <Input.Password
                            id="password"
                            iconRender={(visible) =>
                                visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                            }
                            className="h-12 rounded-lg border-gray-300 text-sm"
                            placeholder="Enter your password"
                            onKeyDown={(e) => handleKeyDown(e, 'submit')}
                        />
                    </MyFormItem>

                    <button
                        type="submit"
                        id="submit"
                        className="mt-4 h-12 w-full rounded-lg bg-[#209F20] text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#1a8a1a] active:bg-[#177017]"
                    >
                        Sign in
                    </button>
                </Form>
            </div>

            {/* Right panel — full-height image */}
            <div className="relative w-1/2">
                <img
                    src="./Login_image.png"
                    alt="Login visual"
                    className="absolute inset-0 h-full w-full object-cover"
                />
                {/* Optional subtle overlay for depth */}
                <div className="absolute inset-0 bg-black/10" />
            </div>
        </div>
    );
};

export default Login;
