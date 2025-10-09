import { useState, useRef } from 'react';
import { InputWithLabel } from '@/components/shared';
import { defaultHeaders, passwordPolicies } from '@/lib/common';
import { useFormik } from 'formik';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { Button } from 'react-daisyui';
import toast from 'react-hot-toast';
import type { ApiResponse } from 'types';
import * as Yup from 'yup';
import TogglePasswordVisibility from '../shared/TogglePasswordVisibility';
import AgreeMessage from './AgreeMessage';
import GoogleReCAPTCHA from '../shared/GoogleReCAPTCHA';
import ReCAPTCHA from 'react-google-recaptcha';
import { maxLengthPolicies } from '@/lib/common';

interface JoinProps {
  recaptchaSiteKey: string | null;
}

const JoinUserSchema = Yup.object().shape({
  name: Yup.string().required().max(maxLengthPolicies.name),
  email: Yup.string().required().email().max(maxLengthPolicies.email),
  password: Yup.string()
    .required()
    .min(passwordPolicies.minLength)
    .max(maxLengthPolicies.password),
  company: Yup.string().required().min(3).max(maxLengthPolicies.company),
});

const Join = ({ recaptchaSiteKey }: JoinProps) => {
  const router = useRouter();
  const { t } = useTranslation('common');
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string>('');
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const handlePasswordVisibility = () => {
    setIsPasswordVisible((prev) => !prev);
  };

  const formik = useFormik({
    initialValues: {
      name: '',
      email: '',
      password: '',
      company: '',
    },
    validationSchema: JoinUserSchema,
    validateOnChange: false,
    validateOnBlur: false,
    onSubmit: async (values) => {
      // If using invisible reCAPTCHA, execute it programmatically to get a token
      let token = recaptchaToken;
      if (recaptchaSiteKey) {
        try {
          // executeAsync is provided by the widget instance; cast to any to be safe with typings
          const exec = (recaptchaRef.current as any)?.executeAsync;
          if (exec) {
            token = (await exec.call(recaptchaRef.current)) as string;
            setRecaptchaToken(token);
          } else {
            // Fallback: try execute() which doesn't return a promise
            (recaptchaRef.current as any)?.execute?.();
            // Wait for onChange to set the token (short timeout) - best effort fallback
            await new Promise((resolve) => setTimeout(resolve, 1000));
            token = recaptchaToken;
          }
        } catch (err) {
          console.error('reCAPTCHA execution failed', err);
          toast.error(t('recaptcha-failed') || 'reCAPTCHA verification failed');
          return;
        }
      }

      const response = await fetch('/api/auth/join', {
        method: 'POST',
        headers: defaultHeaders,
        body: JSON.stringify({
          ...values,
          recaptchaToken: token,
        }),
      });

      const json = (await response.json()) as ApiResponse<{
        confirmEmail: boolean;
      }>;

      // Reset the widget so it can be used again
      (recaptchaRef.current as any)?.reset?.();

      if (!response.ok) {
        toast.error(json.error.message);
        return;
      }

      formik.resetForm();

      if (json.data.confirmEmail) {
        router.push('/auth/verify-email');
      } else {
        toast.success(t('successfully-joined'));
        router.push('/auth/login');
      }
    },
  });

  return (
    <form onSubmit={formik.handleSubmit}>
      <div className="space-y-1">
        <InputWithLabel
          type="text"
          label={t('name')}
          name="name"
          placeholder={t('your-name')}
          value={formik.values.name}
          error={formik.touched.name ? formik.errors.name : undefined}
          onChange={formik.handleChange}
        />
        <InputWithLabel
          type="text"
          label={t('company')}
          name="company"
          placeholder={t('company-name')}
          value={formik.values.company}
          error={formik.errors.company}
          onChange={formik.handleChange}
        />
        <InputWithLabel
          type="email"
          label={t('email')}
          name="email"
          placeholder={t('email-placeholder')}
          value={formik.values.email}
          error={formik.errors.email}
          onChange={formik.handleChange}
        />
        <div className="relative flex">
          <InputWithLabel
            type={isPasswordVisible ? 'text' : 'password'}
            label={t('password')}
            name="password"
            placeholder={t('password')}
            value={formik.values.password}
            error={formik.errors.password}
            onChange={formik.handleChange}
          />
          <TogglePasswordVisibility
            isPasswordVisible={isPasswordVisible}
            handlePasswordVisibility={handlePasswordVisibility}
          />
        </div>
        <GoogleReCAPTCHA
          recaptchaRef={recaptchaRef}
          onChange={setRecaptchaToken}
          siteKey={recaptchaSiteKey}
        />
      </div>
      <div className="mt-3 space-y-3">
        <Button
          type="submit"
          color="primary"
          loading={formik.isSubmitting}
          active={formik.dirty}
          fullWidth
          size="md"
        >
          {t('create-account')}
        </Button>
        <AgreeMessage text={t('create-account')} />
      </div>
    </form>
  );
};

export default Join;
