import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// Override the return types to be just the data (T), not AxiosResponse<T>
interface CustomAxiosInstance extends AxiosInstance {
  (config: AxiosRequestConfig): Promise<any>;
  (url: string, config?: AxiosRequestConfig): Promise<any>;
  request<T = any, R = T, D = any>(config: AxiosRequestConfig<D>): Promise<R>;
  get<T = any, R = T, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
  delete<T = any, R = T, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
  head<T = any, R = T, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
  options<T = any, R = T, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
  post<T = any, R = T, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
  put<T = any, R = T, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
  patch<T = any, R = T, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
  postForm<T = any, R = T, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
  putForm<T = any, R = T, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
  patchForm<T = any, R = T, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
}

declare const service: CustomAxiosInstance;
export default service;
