import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { EXRLoader } from "three/addons/loaders/EXRLoader.js";
import { MODEL_DATA } from "./Model.js";

document.addEventListener('DOMContentLoaded', () => {
    const cassetteModel = new CassetteModel();
})

class CassetteModel{
    constructor(){
        this.container = document.querySelector('.modelViewer');

        //必要な要素を宣言（カメラ、シーン、ローダー、レンダラー）
        this.camera = null;
        this.scene = null;
        this.loader = null;
        this.renderer = null;

        //モデルを格納する変数
        this.model = null;

        //モデルデータを配列に変換
        this.modelDataArray = Object.values(MODEL_DATA);
        this.models = [];
        this.modelGroup = new THREE.Group();

        //レイキャスト（当たり判定）関連の変数
        this.raycaster = null;
        this.mouse = null;

        // アニメーション関連の変数
        this.clock = new THREE.Clock(); //クロックの作成
        this.totalTime = 0; //経過時間を初期化

        this.init();
    }

    init(){
        this.setupScene();
        this.setupRenderer();
        this.setupCamera();
        this.setupLights();
        this.setupEnviroment();
        this.setupModelGrpup();
        this.setupLoadModel();
        this.setupResizehandle();
        this.setupAnimation();
    }

    /*シーンの作成
    =============================*/
    setupScene(){
        this.scene = new THREE.Scene();
        this.scene.background = null;
    }

    /*レンダラーの作成
    =============================*/
    setupRenderer(){
        this.renderer = new THREE.WebGLRenderer({
            antialias: true, //アンチエイリアス
            alpha: true, //透過
        });

        this.renderer.setSize( //レンダラーのサイズを指定
            this.container.clientWidth,
            this.container.clientHeight
        );

        this.container.appendChild(this.renderer.domElement); //取得要素の子要素として追加
    }

    /*リサイズ処理
    =============================*/
    setupResizehandle(){
        window.addEventListener('resize', () => {
            const width = this.container.clientWidth;
            const height = this.container.clientHeight;

            this.renderer.setSize(width, height); //レンダラーのサイズを変更
            this.camera.aspect = width / height; //カメラのサイズを変更

            this.camera.updateProjectionMatrix();
        })
    }

    /*カメラの作成
    =============================*/
    setupCamera(){
        const aspect = this.container.clientWidth / this.container.clientHeight; //縦横比を要素から取得
        this.camera = new THREE.PerspectiveCamera(
            10, //視野角
            aspect, //カメラ比率を要素の縦横比
            0.1, //カメラの最短描画距離
            1000 //カメラの最長描画距離
        );

        this.camera.position.set(0, 15, 30); // (x, y, z)の位置にカメラを設定
        this.cameraTarget = new THREE.Vector3(0, 0, 0); // (x, y, z)の位置にカメラの注視点を設定
        this.camera.lookAt(this.cameraTarget); //カメラの視点を注視点に設定

    }

    /*環境テクスチャのロード
    =============================*/
    setupEnviroment(){
        const exrLoader = new EXRLoader();
        exrLoader.load('./exr/sky-image.exr', (texture) => {
                texture.mapping = THREE.EquirectangularReflectionMapping;
                this.scene.environment = texture;
                this.scene.background = null;
            },
            undefined,(error) => {console.error('環境テクスチャの読み込みエラー:',error);}
        );
    }

    /*モデルグループの作成
    =============================*/
    setupModelGrpup(){
        this.scene.add(this.modelGroup);
        this.modelGroup.rotation.y = THREE.MathUtils.degToRad(-45); //モデルグループのY軸を回転
        this.modelCenter = new THREE.Vector3(); //モデルの中心座標を取得
    }

    /*モデルのロード
    =============================*/
    setupLoadModel(){
        this.loader = new GLTFLoader();

        this.modelDataArray.forEach((modelData, i )=> {
            this.loader.load(modelData.path, (gltf) => {
                const model = gltf.scene;

                model.traverse((child) => {
                    if(child.isMesh){
                        const material = child.material; //マテリアルを取得
                        
                        //マテリアルがテクスチャを持っている場合
                        if(material.map){
                            material.transparent = true; //透過を有効にする
                            material.alphaTest = 0.1; //アルファテストを設定
                            material.side = THREE.DoubleSide; //両面描画を有効にする
                            material.depthWrite = true; //デプスバッファを有効にする
                            material.needsUpdate = true; //マテリアルを更新
                        }
                        
                    }
                });

                model.position.set(0, 0, i * -0.5); //モデルの位置を設定
                this.modelGroup.add(model); //モデルをグループに追加

                //モデルを配列に格納
                this.models.push({
                    model: model, //モデルデータ
                    id: modelData.id, //モデルID
                    index: i, //モデルのインデックス
                    isFloating: false,
                    isLoaded: true,
                });

                console.log(`モデル${modelData.id}の読み込み完了`);     
            },
            (progress) => {
                console.log(`モデル${modelData.id}の読み込み中:,${(progress.loaded / progress.total) * 100}%`);
            }
            ,(error) => {
                console.error('モデルの読み込みエラー:',error);
            });
        });
    }

    /*ライトの作成
    =============================*/
    setupLights() {
        // 環境光
        const ambientLight = new THREE.AmbientLight(0xffffff, 5);
        this.scene.add(ambientLight);

        // 方向光源
        const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
        directionalLight.position.set(0, 0, 5);
        this.scene.add(directionalLight);
        
        // 追加光源（Y軸回転に合わせて配置）
        const sideLight = new THREE.DirectionalLight(0xffffff, 1.5);
        sideLight.position.set(5, 0, 0);
        this.scene.add(sideLight);
    }

    /*アニメーションの設定
    =============================*/
    setupAnimation(){
        this.animate = this.animate.bind(this);
        const checkModelsLoaded = setInterval(() => {
            if(this.models.length === this.modelDataArray.length){
                clearInterval(checkModelsLoaded);
                this.floatingAnimate();
            }
        }, 100);
        requestAnimationFrame(this.animate);
    }
    
    /* 浮遊アニメーション
    ======================ß=======*/
    floatingAnimate(){
        this.models.forEach((modelObj, i) => {
            
            const model = modelObj.model;
            const initY = model.position.y;

            if(!model.isFloating && model.isLoaded) { //モデルの状態がロードされているとき

                const tl = gsap.timeline({repeat: -1, yoyo: true});

                tl.to(model.position, {
                    y: initY + 0.1,
                    duration: 1,
                    ease: "power2.inOut",
                });

                modelObj.isFloating = true;

            }


        });
    }

    /*アニメーションループ
    =============================*/ 
    animate() {
        const delta = this.clock.getDelta(); //経過時間を取得
        this.totalTime += delta; //経過時間を加算

        // カメラの注視点を更新
        this.updateCameraTarget();
        // レンダリング
        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(this.animate);
    }

    /*カメラの注視点を更新
    =============================*/
    updateCameraTarget(){
        if (this.models.length > 0) {
            this.modelCenter.set(0, 0, 0); //モデルの中心座標をリセット

            let tempCenter = new THREE.Vector3(); //一時的な中心座標を作成

            this.models.forEach((modelObj) => {
                modelObj.model.getWorldPosition(tempCenter); //モデルのグローバル座標を取得
                this.modelCenter.add(tempCenter); //中心座標に加算
            });

            this.modelCenter.divideScalar(this.models.length); //中心座標をモデル数で割る
            this.modelCenter.y += 0.3;

        }else{
            this.modelGroup.getWorldPosition(this.modelCenter); //モデルグループのグローバル座標を取得
        }
        this.camera.lookAt(this.modelCenter); //カメラの視点を中心座標に設定
    }
}